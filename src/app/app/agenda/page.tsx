"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";

const appointments = [
  { id: 1, s: "Alongamento em Gel", d: "12 Mai, 10:00", status: "confirmado", p: 180 },
  { id: 2, s: "Manutenção", d: "26 Mai, 14:00", status: "pendente", p: 80 },
];

export default function ClientAgendaPage() {
  const [appts, setAppts] = useState(appointments);

  const cancel = (id: number) => {
    if (confirm("Cancelar agendamento?")) {
      setAppts(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div style={{ padding: "24px 20px" }}>
      <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 26, fontWeight: 600, color: "var(--text)", marginBottom: 18 }}>Meus Agendamentos</h2>

      {appts.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
          <p>Nenhum agendamento ativo.</p>
        </div>
      )}

      {appts.map(a => {
        const sc = statusColors[a.status] || statusColors.pendente;
        return (
          <div key={a.id} style={{ background: "white", borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: "1px solid var(--border)", boxShadow: "0 1px 8px oklch(40% 0.05 340 / 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{a.s}</p>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} color="var(--text-light)" /> {a.d}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>
                {a.status}
              </span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(a.p)}</span>
              <button onClick={() => cancel(a.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--text-mid)" }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
