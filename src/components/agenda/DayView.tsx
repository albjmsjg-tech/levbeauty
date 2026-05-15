"use client";

import type { Appointment } from "@/types";
import { statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";

const DAYS_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export function ApptRow({ a, onOpen }: { a: Appointment; onOpen?: (a: Appointment) => void }) {
  const sc = statusColors[a.status] || statusColors.pendente;
  return (
    <div
      onClick={() => onOpen?.(a)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: "oklch(98% 0.01 75)",
        border: "1px solid var(--border)",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(84% 0.065 350))",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-poppins)", color: "var(--mauve)" }}>{a.time}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", margin: 0 }}>{a.name}</p>
        <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.svc}</p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)", margin: 0 }}>{fmt(a.price)}</p>
        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "2px 7px", borderRadius: 10, background: sc.bg, color: sc.color }}>{a.status}</span>
      </div>
    </div>
  );
}

interface DayViewProps {
  appts: Appointment[];
  loading: boolean;
  date: string;
  onOpen?: (a: Appointment) => void;
}

export function DayView({ appts, loading, date, onOpen }: DayViewProps) {
  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const label = `${DAYS_PT[dateObj.getDay()]}, ${d} de ${MONTHS_PT[m - 1]} de ${y}`;
  const revenue = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + a.price, 0);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "var(--border)" }} />)}
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 600, marginBottom: 14 }}>
        {label}
      </p>
      {appts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>
          Nenhum agendamento para este dia.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {appts.map(a => <ApptRow key={String(a.id)} a={a} onOpen={onOpen} />)}
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(97% 0.03 75)", border: "1px solid oklch(90% 0.04 75)", fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--text-mid)", display: "flex", justifyContent: "space-between" }}>
            <span>{appts.length} agendamento{appts.length !== 1 ? "s" : ""}</span>
            <strong style={{ color: "var(--gold)" }}>{fmt(revenue)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
