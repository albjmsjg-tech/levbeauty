"use client";

import { useState, useEffect } from "react";
import { Bell, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/utils";

const DAYS_PT   = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatApptDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAYS_PT[d.getDay()]}, ${day} ${MONTHS_PT[month - 1]}`;
}

interface NextAppt {
  serviceLabel: string;
  apptDate: string;
  apptTime: string;
}

interface HistoryItem {
  id: string;
  apptDate: string;
  totalPrice: number;
  serviceLabel: string;
}

type ItemRow = { service_name: string; position: number };

function buildServiceLabel(items: ItemRow[]): string {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const first = sorted[0]?.service_name ?? "Serviço";
  return sorted.length > 1 ? `${first} +${sorted.length - 1}` : first;
}

export default function ClientHomePage() {
  const [clientName, setClientName] = useState("");
  const [nextAppt, setNextAppt]     = useState<NextAppt | null>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setClientName((profile.full_name as string).split(" ")[0]);

      const now   = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Próximo agendamento — profile_id é o vínculo correto com auth.uid()
      const { data: appt } = await supabase
        .from("appointments")
        .select("id, appt_date, appt_time, appointment_items(service_name, position)")
        .eq("profile_id", user.id)
        .gte("appt_date", today)
        .neq("status", "cancelado")
        .order("appt_date", { ascending: true })
        .order("appt_time",  { ascending: true })
        .limit(1)
        .maybeSingle();

      if (appt) {
        setNextAppt({
          serviceLabel: buildServiceLabel((appt.appointment_items as ItemRow[] | null) ?? []),
          apptDate: appt.appt_date as string,
          apptTime: appt.appt_time as string,
        });
      }

      // Histórico — agendamentos concluídos, mais recentes primeiro
      const { data: histData } = await supabase
        .from("appointments")
        .select("id, appt_date, total_price, appointment_items(service_name, position)")
        .eq("profile_id", user.id)
        .eq("status", "concluido")
        .order("appt_date", { ascending: false })
        .limit(20);

      type HistRow = {
        id: string;
        appt_date: string;
        total_price: number | string;
        appointment_items: ItemRow[];
      };
      setHistory(
        ((histData ?? []) as HistRow[]).map(row => ({
          id: row.id,
          apptDate: row.appt_date,
          totalPrice: Number(row.total_price),
          serviceLabel: buildServiceLabel(row.appointment_items ?? []),
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <div style={{ height: 130, borderRadius: 16, background: "var(--border)", marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 10, background: "var(--border)", marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "#B89A8F", padding: "28px 20px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "oklch(95% 0.04 75 / 0.4)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 10, width: 80, height: 80, borderRadius: "50%", background: "rgba(184,154,143,0.15)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "oklch(40% 0.05 340)", letterSpacing: "0.05em" }}>
              Olá{clientName ? `, ${clientName}` : ""} 👋
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 600, color: "var(--mauve-dark)", marginTop: 2, lineHeight: 1.1 }}>Pronta para arrasar?</h2>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}>
            <Bell size={16} color="white" />
          </button>
        </div>

        {/* Próximo agendamento */}
        <div style={{ marginTop: 16, background: "white", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 12px oklch(40% 0.05 10 / 0.12)" }}>
          <Calendar size={16} color="var(--gold)" />
          <div>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>Próximo agendamento</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginTop: 1 }}>
              {nextAppt
                ? `${nextAppt.serviceLabel} · ${formatApptDate(nextAppt.apptDate)} · ${nextAppt.apptTime}`
                : "Nenhum agendamento próximo"}
            </p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div style={{ padding: "22px 20px 32px" }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>Histórico</h3>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 20px", background: "white", borderRadius: 14, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✂️</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>
              Nenhum histórico ainda
            </p>
            <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>
              Seu primeiro atendimento aparecerá aqui após ser realizado.
            </p>
          </div>
        ) : (
          history.map(h => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>{h.serviceLabel}</p>
                <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>{formatApptDate(h.apptDate)}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "var(--mauve)" }}>{fmt(h.totalPrice)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
