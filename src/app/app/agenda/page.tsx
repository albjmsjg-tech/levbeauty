"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";

const DAYS_PT   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatAgendaDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAYS_PT[d.getDay()]}, ${day} de ${MONTHS_PT[month - 1]}`;
}

type ItemRow = { service_name: string; position: number };

function buildServiceLabel(items: ItemRow[]): string {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const first = sorted[0]?.service_name ?? "Serviço";
  return sorted.length > 1 ? `${first} +${sorted.length - 1}` : first;
}

interface AgendaItem {
  id: string;
  serviceLabel: string;
  apptDate: string;
  apptTime: string;
  status: string;
  totalPrice: number;
}

export default function ClientAgendaPage() {
  const [appts, setAppts]   = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("appointments")
        .select("id, appt_date, appt_time, status, total_price, appointment_items(service_name, position)")
        .eq("profile_id", user.id)
        .in("status", ["pendente", "confirmado"])
        .order("appt_date", { ascending: true })
        .order("appt_time",  { ascending: true });

      type Row = {
        id: string;
        appt_date: string;
        appt_time: string;
        status: string;
        total_price: number | string;
        appointment_items: ItemRow[];
      };

      setAppts(
        ((data ?? []) as Row[]).map(row => ({
          id: row.id,
          serviceLabel: buildServiceLabel(row.appointment_items ?? []),
          apptDate: row.appt_date,
          apptTime: row.appt_time,
          status: row.status,
          totalPrice: Number(row.total_price),
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("Cancelar este agendamento?")) return;
    const supabase = createClient();
    await supabase
      .from("appointments")
      .update({ status: "cancelado" })
      .eq("id", id);
    setAppts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div style={{ padding: "24px 20px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 86, borderRadius: 14, background: "var(--border)", marginBottom: 10 }} />
        ))}
      </div>
    );
  }

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
        const sc = statusColors[a.status] ?? statusColors.pendente;
        return (
          <div key={a.id} style={{ background: "white", borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: "1px solid var(--border)", boxShadow: "0 1px 8px oklch(40% 0.05 340 / 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{a.serviceLabel}</p>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} color="var(--text-light)" />
                  {formatAgendaDate(a.apptDate)} · {a.apptTime}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>
                {a.status}
              </span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(a.totalPrice)}</span>
              <button
                onClick={() => cancel(a.id)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--text-mid)" }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
