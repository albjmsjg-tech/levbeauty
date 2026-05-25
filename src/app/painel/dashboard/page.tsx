"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, DollarSign, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, mapDbCost, greeting, getWeekDates, toISODate } from "@/lib/supabase/queries";
import type { Appointment, FixedCost } from "@/types";
import { fmt } from "@/lib/utils";
import { ViewToggle } from "@/components/agenda/ViewToggle";
import { WeekView } from "@/components/agenda/WeekView";
import { Button, Card, Badge } from "@/components/ui";

function localISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DashTab = "hoje" | "semana" | "mes";

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral" | "info"> = {
  "concluído":  "success",
  "pendente":   "warning",
  "cancelado":  "neutral",
  "confirmado": "info",
};

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
        .from("appointments").select("total_price, appt_date, status")
        .eq("salon_id", salon.id)
        .gte("appt_date", firstDay).lte("appt_date", lastDay)
        .neq("status", "cancelado");
      const rows = (mRows ?? []) as { total_price: number; appt_date: string; status: string }[];
      setMonthData(rows.map(r => ({ price: Number(r.total_price), appt_date: r.appt_date, status: r.status })));
      setMonthRevenue(rows.filter(r => r.status === "concluido").reduce((s, r) => s + Number(r.total_price), 0));
      setMonthCount(rows.filter(r => r.status === "concluido").length);

      setLoading(false);
    }
    init();
  }, [router]);

  const loadTodayAppts = useCallback(async () => {
    if (!salonId) return;
    setLoadingAppts(true);
    const supabase = createClient();
    const { data } = await supabase.from("appointments")
      .select("*, appointment_items(id, service_id, service_name, price, duration_min, position)")
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
    const { data } = await supabase.from("appointments")
      .select("*, appointment_items(id, service_id, service_name, price, duration_min, position)")
      .eq("salon_id", salonId).gte("appt_date", weekStart).lte("appt_date", weekEnd)
      .order("appt_date").order("appt_time");
    setWeekAppts((data ?? []).map(r => mapDbAppt(r as Record<string, unknown>)));
    setLoadingWeek(false);
  }, [salonId, weekStart, weekEnd]);

  useEffect(() => {
    if (dashTab === "semana") loadWeekAppts();
  }, [dashTab, loadWeekAppts]);

  const dayRevenue   = todayAppts.filter(a => a.status === "concluído").reduce((s, a) => s + a.totalPrice, 0);
  const agendHoje    = todayAppts.filter(a => a.status !== "cancelado").length;
  const totalFixed   = costs.reduce((s, c) => s + c.val, 0);
  const ticketMedio  = monthCount > 0 ? monthRevenue / monthCount : 0;

  const topDays = useMemo(() => Object.entries(
    monthData.reduce((acc, r) => {
      acc[r.appt_date] = (acc[r.appt_date] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a).slice(0, 3), [monthData]);

  const kpis = [
    { label: "Receita Hoje",   val: fmt(dayRevenue),   sub: `${todayAppts.filter(a => a.status === "concluído").length} concluídos`, icon: DollarSign },
    { label: "Agend. Hoje",    val: String(agendHoje), sub: `${todayAppts.filter(a => a.status === "pendente").length} pendente(s)`,  icon: Calendar   },
    { label: "Receita Mensal", val: fmt(monthRevenue), sub: `${monthCount} concluídos`,                                               icon: BarChart3   },
    { label: "Ticket Médio",   val: fmt(ticketMedio),  sub: "Serviços concluídos",                                                    icon: TrendingUp  },
  ];

  if (!hasSalon && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <h2 className="font-display text-2xl font-semibold text-onyx mb-2">
          Configure seu salão primeiro
        </h2>
        <p className="font-sans text-sm text-silver mb-6">
          Complete o onboarding para começar a usar o painel.
        </p>
        <Button variant="primary" onClick={() => router.push("/onboarding")}>
          Configurar agora →
        </Button>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-8 bg-cream">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-onyx leading-tight">
            {greeting()}{ownerName ? `, ${ownerName}` : ""}
          </h1>
          <p className="font-sans text-sm text-silver mt-1">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm">
            <Bell size={14} />
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push("/painel/agenda")}>
            <Plus size={14} /> Novo agend.
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 border border-silver/20">
              <div className="flex justify-between items-start mb-3">
                <p className="font-sans text-xs text-silver font-medium">{k.label}</p>
                <div className="w-8 h-8 rounded-lg bg-cream border border-silver/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-silver" />
                </div>
              </div>
              {loading ? (
                <div className="h-8 rounded-md bg-silver/20 mb-2" />
              ) : (
                <p className="font-display text-2xl font-semibold text-onyx">{k.val}</p>
              )}
              <p className="font-sans text-xs text-silver mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Bottom grid ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Agenda */}
        <Card className="!bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-lg font-semibold text-onyx">Agenda</h3>
            <ViewToggle
              options={[
                { key: "hoje",   label: "Hoje" },
                { key: "semana", label: "Esta Semana" },
                { key: "mes",    label: "Este Mês" },
              ]}
              value={dashTab}
              onChange={v => setDashTab(v as DashTab)}
            />
          </div>

          {/* HOJE */}
          {dashTab === "hoje" && (
            loading || loadingAppts ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-silver/20" />)}
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-sans text-sm text-silver mb-4">Nenhum agendamento hoje.</p>
                <Button variant="secondary" size="sm" onClick={() => router.push("/painel/agenda")}>
                  + Agendar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todayAppts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-cream border border-silver/20">
                    <span className="font-sans text-xs font-semibold text-silver w-10 text-center flex-shrink-0">
                      {a.time}
                    </span>
                    <div className="w-px h-8 bg-silver/20 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-semibold text-onyx">{a.name}</p>
                      <p className="font-sans text-xs text-silver truncate">
                        {a.items.length > 0 ? a.items.map(it => it.serviceName).join(" + ") : "—"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-sans text-sm font-semibold text-blush">{fmt(a.totalPrice)}</p>
                      <Badge variant={STATUS_VARIANT[a.status] ?? "neutral"}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
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
              <div className="flex flex-col gap-2.5">
                {[1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-silver/20" />)}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-cream rounded-xl p-4 border border-silver/20">
                    <p className="font-sans text-[10px] text-silver font-medium tracking-widest uppercase mb-1.5">
                      Agendamentos
                    </p>
                    <p className="font-display text-3xl font-bold text-onyx">{monthData.length}</p>
                  </div>
                  <div className="bg-cream rounded-xl p-4 border border-silver/20">
                    <p className="font-sans text-[10px] text-silver font-medium tracking-widest uppercase mb-1.5">
                      Receita
                    </p>
                    <p className="font-display text-2xl font-bold text-blush">{fmt(monthRevenue)}</p>
                  </div>
                </div>

                {topDays.length > 0 && (
                  <div className="mb-4">
                    <p className="font-sans text-[10px] text-silver font-medium tracking-widest uppercase mb-2">
                      Dias Mais Cheios
                    </p>
                    {topDays.map(([date, count]) => {
                      const label = new Date(date + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <div key={date} className="flex justify-between items-center py-1.5 border-b border-silver/20">
                          <span className="font-sans text-xs text-silver">{label}</span>
                          <span className="font-sans text-xs font-semibold text-blush">{count} agend.</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push("/painel/agenda?view=mes")}
                >
                  Ver agenda completa →
                </Button>
              </div>
            )
          )}
        </Card>

        {/* Custos Fixos */}
        <Card className="!bg-white">
          <h3 className="font-display text-lg font-semibold text-onyx mb-1">Custos Fixos/Mês</h3>
          <p className="font-sans text-xs text-silver mb-4">
            Total:{" "}
            <span className="font-semibold text-onyx">{loading ? "..." : fmt(totalFixed)}</span>
          </p>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-5 rounded bg-silver/20" />)}
            </div>
          ) : costs.length === 0 ? (
            <p className="font-sans text-sm text-silver text-center py-4">
              Nenhum custo cadastrado.
            </p>
          ) : (
            costs.slice(0, 5).map((c, i) => (
              <div key={i} className="flex justify-between items-center mb-2">
                <span className="font-sans text-xs text-silver">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1 rounded-full bg-silver/20 overflow-hidden">
                    <div
                      className="h-full bg-blush rounded-full"
                      style={{ width: `${totalFixed > 0 ? (c.val / totalFixed) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-sans text-xs font-semibold text-onyx min-w-[60px] text-right">
                    {fmt(c.val)}
                  </span>
                </div>
              </div>
            ))
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={() => router.push("/painel/financeiro")}
          >
            Gerenciar Custos →
          </Button>
        </Card>

      </div>
    </div>
  );
}
