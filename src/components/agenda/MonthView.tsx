"use client";

import type { Appointment } from "@/types";
import { toISODate } from "@/lib/supabase/queries";
import { fmt } from "@/lib/utils";
import { ApptRow } from "./DayView";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

interface MonthViewProps {
  appts: Appointment[];
  loading: boolean;
  year: number;
  month: number; // 0-indexed
  selectedDate: string | null;
  onSelectDate: (iso: string) => void;
  onOpen?: (a: Appointment) => void;
}

export function MonthView({ appts, loading, year, month, selectedDate, onSelectDate, onOpen }: MonthViewProps) {
  const today = toISODate(new Date());

  const byDate: Record<string, Appointment[]> = {};
  appts.forEach(a => {
    if (a.date) {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    }
  });

  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const total = appts.filter(a => a.status !== "cancelado").length;
  const revenue = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + a.totalPrice, 0);
  const selectedAppts = selectedDate ? (byDate[selectedDate] ?? []) : [];

  if (loading) {
    return <div style={{ height: 280, borderRadius: 14, background: "var(--border)" }} />;
  }

  return (
    <div>
      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-light)", fontFamily: "var(--font-poppins)", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 20 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;

          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayAppts = byDate[iso] ?? [];
          const hasConfirmed = dayAppts.some(a => a.status === "confirmado" || a.status === "concluído");
          const hasPending = dayAppts.some(a => a.status === "pendente");
          const isSelected = iso === selectedDate;
          const isToday = iso === today;

          let bg = "oklch(98% 0.01 75)";
          if (isSelected) bg = "var(--gold)";
          else if (hasConfirmed) bg = "oklch(94% 0.04 75)";
          else if (hasPending) bg = "oklch(97% 0.02 60)";

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              style={{
                padding: "7px 4px",
                borderRadius: 8,
                border: isToday && !isSelected ? "2px solid var(--gold)" : "1px solid transparent",
                background: bg,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <p style={{
                fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? "white" : isToday ? "var(--gold)" : "var(--text)",
                fontFamily: "var(--font-poppins)", margin: 0,
              }}>{day}</p>
              {dayAppts.length > 0 && (
                <span style={{
                  display: "inline-block", fontSize: 9, fontWeight: 700,
                  fontFamily: "var(--font-poppins)", padding: "1px 5px", borderRadius: 10,
                  background: isSelected ? "rgba(255,255,255,0.35)" : hasConfirmed ? "var(--gold)" : "oklch(78% 0.07 60)",
                  color: "white", marginTop: 2,
                }}>
                  {dayAppts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day appointments */}
      {selectedDate && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            {new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          {selectedAppts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontStyle: "italic" }}>
              Nenhum agendamento neste dia.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedAppts.map(a => <ApptRow key={String(a.id)} a={a} onOpen={onOpen} />)}
            </div>
          )}
        </div>
      )}

      {/* Month footer */}
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(22% 0.04 340)", fontSize: 12, fontFamily: "var(--font-poppins)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {MONTHS_PT[month]}: {total} agend.
        </span>
        <strong style={{ color: "var(--gold)", fontSize: 14 }}>{fmt(revenue)}</strong>
      </div>
    </div>
  );
}
