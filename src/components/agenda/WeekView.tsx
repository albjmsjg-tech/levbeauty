"use client";

import type { Appointment } from "@/types";
import { toISODate } from "@/lib/supabase/queries";
import { fmt } from "@/lib/utils";
import { ApptRow } from "./DayView";

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface WeekViewProps {
  appts: Appointment[];
  loading: boolean;
  weekDates: Date[];
  onOpen?: (a: Appointment) => void;
}

export function WeekView({ appts, loading, weekDates, onOpen }: WeekViewProps) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: "var(--border)" }} />)}
      </div>
    );
  }

  const today = toISODate(new Date());

  const byDate: Record<string, Appointment[]> = {};
  weekDates.forEach(d => { byDate[toISODate(d)] = []; });
  appts.forEach(a => {
    if (a.date && byDate[a.date] !== undefined) byDate[a.date].push(a);
  });

  const total = appts.filter(a => a.status !== "cancelado").length;
  const revenue = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + a.totalPrice, 0);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {weekDates.map(d => {
          const iso = toISODate(d);
          const dayAppts = byDate[iso] ?? [];
          const isToday = iso === today;
          const label = `${DAYS_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

          return (
            <div key={iso}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                color: isToday ? "var(--gold)" : "var(--text-mid)",
                fontFamily: "var(--font-poppins)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                {label}{isToday ? "  · Hoje" : ""}
              </p>
              {dayAppts.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontStyle: "italic", padding: "4px 0" }}>
                  Nenhum agendamento
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dayAppts.map(a => <ApptRow key={String(a.id)} a={a} onOpen={onOpen} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: "10px 14px", borderRadius: 10, background: "oklch(97% 0.03 75)", border: "1px solid oklch(90% 0.04 75)", fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--text-mid)", display: "flex", justifyContent: "space-between" }}>
        <span>{total} agendamento{total !== 1 ? "s" : ""} na semana</span>
        <strong style={{ color: "var(--gold)" }}>{fmt(revenue)}</strong>
      </div>
    </div>
  );
}
