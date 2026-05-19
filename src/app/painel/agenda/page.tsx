"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ComandaModal } from "@/components/agenda/ComandaModal";
import type { ServiceOption } from "@/components/agenda/ComandaModal";
import type { Appointment } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, getOwnerSalon, getWeekDates, weekDayLabel, toISODate } from "@/lib/supabase/queries";
import { addBlock } from "@/app/painel/configuracoes/actions";
import { fmt } from "@/lib/utils";
import { ViewToggle } from "@/components/agenda/ViewToggle";
import { DayView } from "@/components/agenda/DayView";
import { WeekView } from "@/components/agenda/WeekView";
import { MonthView } from "@/components/agenda/MonthView";

const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function weekRangeLabel(weekDates: Date[]): string {
  const first = weekDates[0];
  const last = weekDates[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${MONTHS_FULL[first.getMonth()]} ${last.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
}

type AgendaView = "dia" | "semana" | "mes";

const APPT_SELECT = "*, appointment_items(id, service_id, service_name, price, duration_min, position)";

export default function AgendaPage() {
  const [salonId, setSalonId] = useState<string | null>(null);
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<AgendaView>("semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | null>(toISODate(new Date()));

  const [showComanda, setShowComanda] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockIsAllDay, setBlockIsAllDay] = useState(false);
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("10:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const selectedDate = useMemo(() => toISODate(weekDates[selectedDay]), [weekDates, selectedDay]);
  const targetMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const mesYear = targetMonth.getFullYear();
  const mesMonth = targetMonth.getMonth();

  // Restore view from localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view") as AgendaView | null;
    const stored = localStorage.getItem("agenda-view") as AgendaView | null;
    const valid: AgendaView[] = ["dia", "semana", "mes"];
    const initial = (urlView && valid.includes(urlView))
      ? urlView
      : (stored && valid.includes(stored))
      ? stored
      : "semana";
    setView(initial);
  }, []);

  // Load salon + services once
  useEffect(() => {
    const supabase = createClient();
    getOwnerSalon(supabase).then(async salon => {
      if (!salon) return;
      setSalonId(salon.id as string);
      setSalonSlug((salon.slug as string) ?? null);
      const { data } = await supabase
        .from("services")
        .select("id, name, price, emoji, duration_min")
        .eq("salon_id", salon.id as string)
        .eq("active", true)
        .order("name");
      setServices((data ?? []).map(s => ({
        id: s.id as string,
        name: s.name as string,
        price: Number(s.price),
        durationMin: Number((s as Record<string, unknown>).duration_min ?? 60),
        emoji: (s.emoji as string) ?? "",
      })));
    });
  }, []);

  const loadAppts = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    const supabase = createClient();
    let data: Record<string, unknown>[] | null = null;

    if (view === "dia") {
      const res = await supabase.from("appointments").select(APPT_SELECT)
        .eq("salon_id", salonId).eq("appt_date", selectedDate).order("appt_time");
      data = res.data as Record<string, unknown>[] | null;
    } else if (view === "semana") {
      const wDates = getWeekDates(weekOffset);
      const start = toISODate(wDates[0]);
      const end = toISODate(wDates[6]);
      const res = await supabase.from("appointments").select(APPT_SELECT)
        .eq("salon_id", salonId).gte("appt_date", start).lte("appt_date", end)
        .order("appt_date").order("appt_time");
      data = res.data as Record<string, unknown>[] | null;
    } else {
      const firstDay = `${mesYear}-${String(mesMonth + 1).padStart(2, "0")}-01`;
      const lastDay = `${mesYear}-${String(mesMonth + 1).padStart(2, "0")}-${String(new Date(mesYear, mesMonth + 1, 0).getDate()).padStart(2, "0")}`;
      const res = await supabase.from("appointments").select(APPT_SELECT)
        .eq("salon_id", salonId).gte("appt_date", firstDay).lte("appt_date", lastDay)
        .order("appt_date").order("appt_time");
      data = res.data as Record<string, unknown>[] | null;
    }

    setAppts((data ?? []).map(r => mapDbAppt(r)));
    setLoading(false);
  }, [salonId, view, selectedDate, weekOffset, mesYear, mesMonth]);

  useEffect(() => { loadAppts(); }, [loadAppts]);

  const handleViewChange = (v: string) => {
    const newView = v as AgendaView;
    setView(newView);
    localStorage.setItem("agenda-view", newView);
  };

  const openBlockModal = (date: string) => {
    setBlockDate(date);
    setBlockIsAllDay(false);
    setBlockStartTime("09:00");
    setBlockEndTime("10:00");
    setBlockReason("");
    setBlockError("");
    setShowBlockModal(true);
  };

  const handleSaveBlock = async () => {
    if (!salonId || !blockDate) return;
    if (!blockIsAllDay && blockStartTime >= blockEndTime) {
      setBlockError("O horário de início deve ser antes do fim.");
      return;
    }
    setBlockSaving(true);
    setBlockError("");
    const res = await addBlock(
      salonId, blockDate,
      blockIsAllDay ? null : blockStartTime,
      blockIsAllDay ? null : blockEndTime,
      blockReason || null,
    );
    setBlockSaving(false);
    if (res.error) { setBlockError(res.error); return; }
    setShowBlockModal(false);
  };

  const openNew = () => { setEditAppt(null); setShowComanda(true); };
  const openEdit = (a: Appointment) => { setEditAppt(a); setShowComanda(true); };
  const closeComanda = () => { setShowComanda(false); setEditAppt(null); };
  const onSaved = () => { closeComanda(); loadAppts(); };

  const navigateWeek = (delta: number) => {
    setWeekOffset(prev => {
      const next = prev + delta;
      if (next === 0) setSelectedDay(new Date().getDay());
      return next;
    });
  };

  const defaultDate = view === "mes"
    ? (selectedMonthDate ?? toISODate(new Date()))
    : selectedDate;

  const active = appts.filter(a => a.status !== "cancelado");
  const summaryRev = active.reduce((s, a) => s + a.totalPrice, 0);
  const summaryText = loading
    ? "Carregando..."
    : view === "dia"
    ? `${appts.length} agend. · ${fmt(summaryRev)}`
    : view === "semana"
    ? `${active.length} agend. na semana · ${fmt(summaryRev)}`
    : `${active.length} agend. no mês · ${fmt(summaryRev)}`;

  // ── Navigation block per view ──
  const navBlock = (() => {
    const navBtn = (style?: React.CSSProperties): React.CSSProperties => ({
      width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)",
      background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      ...style,
    });
    const todayBtn: React.CSSProperties = {
      fontSize: 10, color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600,
      background: "none", border: "none", cursor: "pointer", padding: "0 4px",
    };

    if (view === "dia") {
      return (
        <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={() => navigateWeek(-1)} style={navBtn()}><ChevronLeft size={16} color="var(--text-mid)" /></button>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", margin: 0 }}>
                {weekRangeLabel(weekDates)}
              </p>
              {weekOffset !== 0 && (
                <button onClick={() => { setWeekOffset(0); setSelectedDay(new Date().getDay()); }} style={todayBtn}>
                  Ir para hoje
                </button>
              )}
            </div>
            <button onClick={() => navigateWeek(1)} style={navBtn()}><ChevronRight size={16} color="var(--text-mid)" /></button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {weekDates.map((d, i) => {
              const isToday = toISODate(d) === toISODate(new Date());
              return (
                <button key={i} onClick={() => setSelectedDay(i)}
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: "none", background: i === selectedDay ? "var(--gold)" : "oklch(98% 0.01 75)", cursor: "pointer", textAlign: "center", transition: "all 0.15s", position: "relative" }}>
                  <p style={{ fontSize: 10, color: i === selectedDay ? "oklch(94% 0.04 75)" : "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 500, marginBottom: 2 }}>
                    {weekDayLabel(d).split(" ")[0]}
                  </p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: i === selectedDay ? "white" : "var(--text)", fontFamily: "var(--font-poppins)" }}>
                    {d.getDate()}
                  </p>
                  {isToday && <div style={{ width: 4, height: 4, borderRadius: "50%", background: i === selectedDay ? "white" : "var(--gold)", margin: "2px auto 0" }} />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (view === "semana") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid var(--border)" }}>
          <button onClick={() => navigateWeek(-1)} style={navBtn()}><ChevronLeft size={16} color="var(--text-mid)" /></button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", margin: 0 }}>{weekRangeLabel(weekDates)}</p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={todayBtn}>Semana atual</button>
            )}
          </div>
          <button onClick={() => navigateWeek(1)} style={navBtn()}><ChevronRight size={16} color="var(--text-mid)" /></button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid var(--border)" }}>
        <button onClick={() => setMonthOffset(p => p - 1)} style={navBtn()}><ChevronLeft size={16} color="var(--text-mid)" /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", margin: 0 }}>
            {MONTHS_FULL[mesMonth]} {mesYear}
          </p>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)} style={todayBtn}>Mês atual</button>
          )}
        </div>
        <button onClick={() => setMonthOffset(p => p + 1)} style={navBtn()}><ChevronRight size={16} color="var(--text-mid)" /></button>
      </div>
    );
  })();

  return (
    <div style={{ padding: "28px 32px" }}>
      {showComanda && salonId && (
        <ComandaModal
          salonId={salonId}
          salonSlug={salonSlug}
          defaultDate={defaultDate}
          services={services}
          editAppt={editAppt}
          onClose={closeComanda}
          onSaved={onSaved}
        />
      )}

      {showBlockModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0% 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px oklch(0% 0 0 / 0.18)" }}>
            <h4 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: "var(--text)", margin: "0 0 18px" }}>Bloquear horário</h4>

            <div style={{ display: "flex", background: "oklch(96% 0.01 0)", borderRadius: 10, padding: 4, marginBottom: 18, gap: 4 }}>
              {[{ val: true, label: "Dia inteiro" }, { val: false, label: "Horário específico" }].map(opt => (
                <button key={String(opt.val)}
                  onClick={() => setBlockIsAllDay(opt.val)}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer", background: blockIsAllDay === opt.val ? "var(--gold)" : "transparent", color: blockIsAllDay === opt.val ? "white" : "var(--text-mid)", transition: "all 0.15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 }}>Data *</label>
              <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
            </div>

            {!blockIsAllDay && (
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 }}>Início</label>
                  <input type="time" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 }}>Fim</label>
                  <input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 }}>Motivo (opcional)</label>
              <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
                placeholder="Almoço, Reunião, Feriado..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
            </div>

            {blockError && <p style={{ fontSize: 12, color: "oklch(50% 0.15 15)", fontFamily: "var(--font-poppins)", margin: "0 0 12px" }}>{blockError}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBlockModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1.5px solid var(--border)", background: "white", color: "var(--text)", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSaveBlock} disabled={blockSaving || !blockDate}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: blockSaving || !blockDate ? "var(--border)" : "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: blockSaving || !blockDate ? "not-allowed" : "pointer" }}>
                {blockSaving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Agenda</h1>
          <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>
            {summaryText}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ViewToggle
            options={[
              { key: "dia", label: "Dia" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mês" },
            ]}
            value={view}
            onChange={handleViewChange}
          />
          <button
            onClick={openNew}
            style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
            <Plus size={15} color="white" /> Novo
          </button>
        </div>
      </div>

      {navBlock}

      {view === "dia" && (
        <DayView appts={appts} loading={loading} date={selectedDate} onOpen={openEdit} onBlockTime={() => openBlockModal(selectedDate)} />
      )}
      {view === "semana" && (
        <WeekView appts={appts} loading={loading} weekDates={weekDates} onOpen={openEdit} />
      )}
      {view === "mes" && (
        <MonthView
          appts={appts}
          loading={loading}
          year={mesYear}
          month={mesMonth}
          selectedDate={selectedMonthDate}
          onSelectDate={setSelectedMonthDate}
          onOpen={openEdit}
        />
      )}
    </div>
  );
}
