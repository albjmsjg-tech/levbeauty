"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, ChevronRight, Calendar, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { defaultServices } from "@/lib/data";
import { fmt } from "@/lib/utils";

const DAYS_PT  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatApptDate(dateStr: string): string {
  // Parse as local date to avoid UTC-offset shifting the day
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAYS_PT[d.getDay()]}, ${day} ${MONTHS_PT[month - 1]}`;
}

interface NextAppt {
  service_name: string;
  appt_date: string;
  appt_time: string;
}

export default function ClientHomePage() {
  const router = useRouter();
  const [services] = useState(defaultServices);
  const [clientName, setClientName] = useState("");
  const [nextAppt, setNextAppt] = useState<NextAppt | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setClientName((profile.full_name as string).split(" ")[0]);

      // Fetch next appointment — use local date string to avoid UTC timezone shift
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data: appt } = await supabase
        .from("appointments")
        .select("service_name, appt_date, appt_time")
        .eq("client_id", user.id)
        .gte("appt_date", today)
        .neq("status", "cancelado")
        .order("appt_date", { ascending: true })
        .order("appt_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (appt) setNextAppt(appt as NextAppt);
    }
    load();
  }, []);

  const history = [
    { s: "Esmaltação em Gel", d: "15 Abr", p: 90 },
    { s: "Manutenção", d: "02 Abr", p: 80 },
  ];

  return (
    <div>
      {/* Header gradient */}
      <div style={{ background: "linear-gradient(160deg, oklch(88% 0.055 10), oklch(82% 0.065 350))", padding: "28px 20px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "oklch(95% 0.04 75 / 0.4)" }} />
        <div style={{ position: "absolute", bottom: -20, left: 10, width: 80, height: 80, borderRadius: "50%", background: "oklch(72% 0.115 75 / 0.2)" }} />
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

        {/* Next appointment */}
        <div style={{ marginTop: 16, background: "white", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 12px oklch(40% 0.05 10 / 0.12)" }}>
          <Calendar size={16} color="var(--gold)" />
          <div>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>Próximo agendamento</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginTop: 1 }}>
              {nextAppt
                ? `${nextAppt.service_name} · ${formatApptDate(nextAppt.appt_date)} · ${nextAppt.appt_time}`
                : "Nenhum agendamento próximo"}
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div style={{ padding: "22px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)" }}>Nossos Serviços</h3>
          <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 500, fontFamily: "var(--font-poppins)", cursor: "pointer" }}>Ver todos</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {services.map(svc => (
            <div key={svc.id} onClick={() => router.push(`/app/agendar?id=${svc.id}`)}
              style={{ background: "white", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 8px oklch(40% 0.05 340 / 0.07)", cursor: "pointer", border: "1px solid var(--border)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, oklch(92% 0.045 10), oklch(88% 0.06 350))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>💅</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{svc.name}</p>
                <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} color="var(--text-light)" /> {svc.duration}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, fontFamily: "var(--font-poppins)" }}>{fmt(svc.price)}</span>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-light)" />
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div style={{ padding: "22px 20px 24px" }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Histórico</h3>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>{h.s}</p>
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>{h.d}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "var(--mauve)" }}>{fmt(h.p)}</p>
              <div style={{ display: "flex", gap: 2, marginTop: 3, justifyContent: "flex-end" }}>
                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} fill="var(--gold)" color="var(--gold)" />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
