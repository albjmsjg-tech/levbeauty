"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, DollarSign, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, mapDbCost, greeting, getWeekDates, toISODate } from "@/lib/supabase/queries";
import type { Appointment, FixedCost } from "@/types";
import { statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";
import { ViewToggle } from "@/components/agenda/ViewToggle";
import { WeekView } from "@/components/agenda/WeekView";

function localISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DashTab = "hoje" | "semana" | "mes";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [salonId, setSalonId] = useState<string | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [monthData, setMonthData] = useState<{ price: number; appt_date: string; status: string }[]>([]);
  const [hasSalon, setHasSalon] = useState(true);

  const [dashTab, setDashTab] = useState<DashTab>("hoje");
  const [weekAppts, setWeekAppts] = useState<Appointment[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const weekLoadedRef = useRef(false);

  const today = localISO();
  const currentWeekDates = useMemo(() => getWeekDates(0), []);
  const weekStart = useMemo(() => toISODate(currentWeekDates[0]), [currentWeekDates]);
  const weekEnd = useMemo(() => toISODate(currentWeekDates[6]), [currentWeekDates]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setOwnerName((profile.full_name as string).split(" ")[0]);

      const { data: salon } = await supabase
        .from("salons").select("id, slug").eq("owner_id", user.id).maybeSingle();
      if (!salon) { setHasSalon(false); setLoading(false); return; }
      setSalonId(salon.id as string);

      const { data: costRows } = await supabase
        .from("fixed_costs").select("*").eq("salon_id", salon.id).order("created_at");
      setCosts((costRows ?? []).map(r => mapDbCost(r as Record<string, unknown>)));

      const now = new Date();
      const firstDay = localISO(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastDay = localISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));

      const { data: mRows } = await supabase
        .from("appointments").select("price, appt_date, status")
        .eq("salon_id", salon.id)
        .gte("appt_date", firstDay).lte("appt_date", lastDay)
        .neq("status", "cancelado");
      const rows = (mRows ?? []) as { price: number; appt_date: string; status: string }[];
      setMonthData(rows);
      setMonthRevenue(rows.filter(r => r.status === "concluido").reduce((s, r) => s + Number(r.price), 0));
      setMonthCount(rows.filter(r => r.status === "concluido").length);

      setLoading(false);
    }
    init();
  }, [router]);

  const loadTodayAppts = useCallback(async () => {
    if (!salonId) return;
    setLoadingAppts(true);
    const supabase = createClient();
    const { data } = await supabase.from("appointments").select("*")
      .eq("salon_id", salonId).eq("appt_date", today).order("appt_time");
    setTodayAppts((data ?? []).map(r => mapDbAppt(r as Record<string, unknown>)));
    setLoadingAppts(false);
  }, [salonId, today]);

  useEffect(() => { loadTodayAppts(); }, [loadTodayAppts]);

  const loadWeekAppts = useCallback(async () => {
    if (!salonId || weekLoadedRef.current) return;
    weekLoadedRef.current = true;
    setLoadingWeek(true);
    const supabase = createClient();
    const { data } = await supabase.from("appointments").select("*")
      .eq("salon_id", salonId).gte("appt_date", weekStart).lte("appt_date", weekEnd)
      .order("appt_date").order("appt_time");
    setWeekAppts((data ?? []).map(r => mapDbAppt(r as Record<string, unknown>)));
    setLoadingWeek(false);
  }, [salonId, weekStart, weekEnd]);

  useEffect(() => {
    if (dashTab === "semana") loadWeekAppts();
  }, [dashTab, loadWeekAppts]);

  const dayRevenue = todayAppts.filter(a => a.status === "concluído").reduce((s, a) => s + a.price, 0);
  const agendHoje = todayAppts.filter(a => a.status !== "cancelado").length;
  const totalFixed = costs.reduce((s, c) => s + c.val, 0);
  const ticketMedio = monthCount > 0 ? monthRevenue / monthCount : 0;

  const topDays = useMemo(() => Object.entries(
    monthData.reduce((acc, r) => {
      acc[r.appt_date] = (acc[r.appt_date] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a).slice(0, 3), [monthData]);

  const kpis = [
    { label: "Receita Hoje",   val: fmt(dayRevenue),   sub: `${todayAppts.filter(a => a.status === "concluído").length} concluídos`, icon: DollarSign, color: "oklch(72% 0.115 75)",  bg: "oklch(97% 0.045 75)"  },
    { label: "Agend. Hoje",    val: String(agendHoje), sub: `${todayAppts.filter(a => a.status === "pendente").length} pendente(s)`,  icon: Calendar,   color: "oklch(60% 0.1 250)",   bg: "oklch(97% 0.03 250)"  },
    { label: "Receita Mensal", val: fmt(monthRevenue), sub: `${monthCount} concluídos`,                                               icon: BarChart3,  color: "oklch(60% 0.1 145)",   bg: "oklch(97% 0.03 145)"  },
    { label: "Ticket Médio",   val: fmt(ticketMedio),  sub: "Serviços concluídos",                                                    icon: TrendingUp, color: "oklch(60% 0.1 320)",   bg: "oklch(97% 0.03 320)"  },
  ];

  if (!hasSalon && !loading) {
    return (
      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💅</div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>Configure seu salão primeiro</h2>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 24, textAlign: "center" }}>Complete o onboarding para começar a usar o painel.</p>
        <button onClick={() => router.push("/onboarding")} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins)", cursor: "pointer" }}>
          Configurar agora →
        </button>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>
            {greeting()}{ownerName ? `, ${ownerName}` : ""}! 🌸
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
            <Bell size={14} color="var(--text-mid)" />
          </button>
          <button onClick={() => router.push("/painel/agenda")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
            <Plus size={14} color="white" /> Novo agend.
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} style={{ background: "white", borderRadius: 16, padding: 18, border: "1px solid var(--border)", boxShadow: "0 1px 6px oklch(40% 0.04 340 / 0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 500 }}>{k.label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={k.color} />
                </div>
              </div>
              {loading ? (
                <div style={{ height: 32, borderRadius: 6, background: "var(--border)", marginBottom: 8 }} />
              ) : (
                <p style={{ fontFamily: "var(--font-playfair)", fontSize: 26, fontWeight: 600, color: "var(--text)" }}>{k.val}</p>
              )}
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>

        {/* Agenda card with tabs */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Agenda</h3>
            <ViewToggle
              options={[
                { key: "hoje", label: "Hoje" },
                { key: "semana", label: "Esta Semana" },
                { key: "mes", label: "Este Mês" },
              ]}
              value={dashTab}
              onChange={v => setDashTab(v as DashTab)}
            />
          </div>

          {/* HOJE */}
          {dashTab === "hoje" && (
            loading || loadingAppts ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: "var(--border)" }} />)}
              </div>
            ) : todayAppts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>
                Nenhum agendamento hoje.
                <br />
                <button onClick={() => router.push("/painel/agenda")}
                  style={{ marginTop: 12, padding: "8px 18px", borderRadius: 9, border: "1.5px solid var(--gold)", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                  + Agendar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {todayAppts.map((a, i) => {
                  const sc = statusColors[a.status] || statusColors.pendente;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: "oklch(98% 0.01 75)", border: "1px solid var(--border)" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(84% 0.065 350))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-poppins)", color: "var(--mauve)" }}>{a.time}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{a.name}</p>
                        <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.svc}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(a.price)}</p>
                        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color }}>{a.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ESTA SEMANA */}
          {dashTab === "semana" && (
            <WeekView appts={weekAppts} loading={loadingWeek || loading} weekDates={currentWeekDates} />
          )}

          {/* ESTE MÊS */}
          {dashTab === "mes" && (
            loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: "var(--border)" }} />)}
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 12, padding: "14px 16px", border: "1px solid oklch(90% 0.04 75)" }}>
                    <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AGENDAMENTOS</p>
                    <p style={{ fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0 }}>{monthData.length}</p>
                  </div>
                  <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 12, padding: "14px 16px", border: "1px solid oklch(90% 0.04 75)" }}>
                    <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>RECEITA</p>
                    <p style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 700, color: "var(--gold)", margin: 0 }}>{fmt(monthRevenue)}</p>
                  </div>
                </div>

                {topDays.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>DIAS MAIS CHEIOS</p>
                    {topDays.map(([date, count]) => {
                      const label = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{count} agend.</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={() => router.push("/painel/agenda?view=mes")}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid var(--gold)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
                  Ver agenda completa →
                </button>
              </div>
            )
          )}
        </div>

        {/* Fixed costs */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Custos Fixos/Mês</h3>
          <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 14 }}>
            Total: <strong style={{ color: "var(--text)" }}>{loading ? "..." : fmt(totalFixed)}</strong>
          </p>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 20, borderRadius: 4, background: "var(--border)" }} />)}
            </div>
          ) : costs.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", textAlign: "center", padding: "16px 0" }}>Nenhum custo cadastrado.</p>
          ) : (
            costs.slice(0, 5).map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{c.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 60, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${totalFixed > 0 ? (c.val / totalFixed) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg, oklch(88% 0.055 10), var(--gold))", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", minWidth: 60, textAlign: "right" }}>{fmt(c.val)}</span>
                </div>
              </div>
            ))
          )}
          <button onClick={() => router.push("/painel/financeiro")} style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 10, border: "1.5px solid var(--gold)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
            Gerenciar Custos →
          </button>
        </div>
      </div>
    </div>
  );
}
