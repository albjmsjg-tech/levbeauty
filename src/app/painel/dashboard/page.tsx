"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, DollarSign, Calendar, BarChart3, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, mapDbCost, greeting } from "@/lib/supabase/queries";
import type { Appointment, FixedCost } from "@/types";
import { statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";

function localISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return localISO(new Date(y, m - 1, d + delta));
}

function formatViewDate(iso: string): string {
  const today = localISO();
  if (iso === today) return "Hoje";
  if (iso === shiftDay(today, 1)) return "Amanhã";
  if (iso === shiftDay(today, -1)) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [salonId, setSalonId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [hasSalon, setHasSalon] = useState(true);
  const [viewDate, setViewDate] = useState(localISO);

  // One-time load: profile, salon, costs, monthly revenue
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) setOwnerName((profile.full_name as string).split(" ")[0]);

      const { data: salon } = await supabase
        .from("salons").select("id, slug").eq("owner_id", user.id).single();
      if (!salon) { setHasSalon(false); setLoading(false); return; }
      setSalonId(salon.id as string);

      const { data: costRows } = await supabase
        .from("fixed_costs").select("*").eq("salon_id", salon.id).order("created_at");
      setCosts((costRows ?? []).map(r => mapDbCost(r as Record<string, unknown>)));

      const now = new Date();
      const firstDay = localISO(new Date(now.getFullYear(), now.getMonth(), 1));
      const lastDay  = localISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const { data: monthRows } = await supabase
        .from("appointments").select("price")
        .eq("salon_id", salon.id)
        .gte("appt_date", firstDay).lte("appt_date", lastDay)
        .neq("status", "cancelado");
      setMonthRevenue((monthRows ?? []).reduce((s, r) => s + Number(r.price), 0));
      setMonthCount(monthRows?.length ?? 0);

      setLoading(false);
    }
    init();
  }, [router]);

  // Reload appointments when salonId or viewDate changes
  const loadDayAppts = useCallback(async () => {
    if (!salonId) return;
    setLoadingAppts(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments").select("*")
      .eq("salon_id", salonId).eq("appt_date", viewDate)
      .order("appt_time");
    setAppts((data ?? []).map(r => mapDbAppt(r as Record<string, unknown>)));
    setLoadingAppts(false);
  }, [salonId, viewDate]);

  useEffect(() => { loadDayAppts(); }, [loadDayAppts]);

  const dayRevenue = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + a.price, 0);
  const totalFixed = costs.reduce((s, c) => s + c.val, 0);
  const ticketMedio = monthCount > 0 ? monthRevenue / monthCount : 0;
  const isToday = viewDate === localISO();

  const kpis = [
    { label: isToday ? "Receita Hoje" : "Receita do Dia", val: fmt(dayRevenue),    sub: `${appts.filter(a => a.status === "concluído").length} concluídos`, icon: DollarSign, color: "oklch(72% 0.115 75)", bg: "oklch(97% 0.045 75)" },
    { label: isToday ? "Agend. Hoje"  : "Agend. do Dia",  val: String(appts.length), sub: `${appts.filter(a => a.status === "pendente").length} pendente(s)`,  icon: Calendar,   color: "oklch(60% 0.1 250)",  bg: "oklch(97% 0.03 250)"  },
    { label: "Receita Mensal", val: fmt(monthRevenue), sub: `${monthCount} atendimentos`, icon: BarChart3,  color: "oklch(60% 0.1 145)", bg: "oklch(97% 0.03 145)" },
    { label: "Ticket Médio",   val: fmt(ticketMedio),  sub: "Últimos 30 dias",            icon: TrendingUp, color: "oklch(60% 0.1 320)", bg: "oklch(97% 0.03 320)" },
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

        {/* Agenda with day navigation */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Agenda</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setViewDate(d => shiftDay(d, -1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={14} color="var(--text-mid)" />
              </button>
              <span style={{ fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, color: isToday ? "var(--gold)" : "var(--text)", minWidth: 72, textAlign: "center" }}>
                {formatViewDate(viewDate)}
              </span>
              <button onClick={() => setViewDate(d => shiftDay(d, 1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={14} color="var(--text-mid)" />
              </button>
            </div>
          </div>

          {loading || loadingAppts ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 64, borderRadius: 12, background: "var(--border)" }} />)}
            </div>
          ) : appts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>
              Nenhum agendamento {isToday ? "hoje" : "neste dia"}.
              <br />
              <button onClick={() => router.push("/painel/agenda")} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 9, border: "1.5px solid var(--gold)", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                + Agendar
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {appts.map((a, i) => {
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
