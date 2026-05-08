"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Info } from "lucide-react";
import { ApptCard } from "@/components/owner/ApptCard";
import { NewApptModal } from "@/components/owner/NewApptModal";
import type { Appointment } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, apptToDbRow, getOwnerSalon, getWeekDates, weekDayLabel, toISODate } from "@/lib/supabase/queries";
import { fmt } from "@/lib/utils";

export default function AgendaPage() {
  const [salonId, setSalonId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showModal, setShowModal] = useState(false);

  const weekDates = getWeekDates();
  const selectedDate = toISODate(weekDates[selectedDay]);

  // Load salon once on mount
  useEffect(() => {
    const supabase = createClient();
    getOwnerSalon(supabase).then(salon => {
      if (salon) setSalonId(salon.id as string);
    });
  }, []);

  // Load appointments when salon or selected day changes
  const loadAppts = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salonId)
      .eq("appt_date", selectedDate)
      .order("appt_time");
    setAppts((data ?? []).map(r => mapDbAppt(r as Record<string, unknown>)));
    setLoading(false);
  }, [salonId, selectedDate]);

  useEffect(() => { loadAppts(); }, [loadAppts]);

  const update = async (updated: Appointment) => {
    if (!salonId) return;
    setAppts(prev => prev.map(a => a.id === updated.id ? updated : a));
    const supabase = createClient();
    await supabase
      .from("appointments")
      .update({
        client_name: updated.name,
        client_phone: updated.phone || null,
        service_name: updated.svc,
        appt_time: updated.time,
        price: updated.price,
        status: updated.status === "concluído" ? "concluido" : updated.status,
        payment_method: updated.payment === "credit" ? "credito" : updated.payment,
        location: updated.location === "home" ? "domicilio" : "salao",
      })
      .eq("id", updated.id);
  };

  const deleteAppt = async (id: number | string) => {
    setAppts(prev => prev.filter(a => a.id !== id));
    const supabase = createClient();
    await supabase.from("appointments").delete().eq("id", id);
  };

  const addAppt = async (appt: Appointment) => {
    if (!salonId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .insert(apptToDbRow(appt, salonId, selectedDate))
      .select("*")
      .single();
    if (!error && data) {
      const mapped = mapDbAppt(data as Record<string, unknown>);
      setAppts(prev => [...prev, mapped].sort((a, b) => a.time.localeCompare(b.time)));
    }
    setShowModal(false);
  };

  const dayRevTotal = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + Number(a.price), 0);

  return (
    <div style={{ padding: "28px 32px" }}>
      {showModal && <NewApptModal onSave={addAppt} onClose={() => setShowModal(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Agenda</h1>
          <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>
            {loading ? "Carregando..." : `${appts.length} agendamento${appts.length !== 1 ? "s" : ""} · receita prevista `}
            {!loading && <strong style={{ color: "var(--gold)" }}>{fmt(dayRevTotal)}</strong>}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
          <Plus size={15} color="white" /> Novo Agendamento
        </button>
      </div>

      {/* Day picker */}
      <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {weekDates.map((d, i) => (
            <button key={i} onClick={() => setSelectedDay(i)}
              style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: "none", background: i === selectedDay ? "var(--gold)" : "oklch(98% 0.01 75)", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
              <p style={{ fontSize: 10, color: i === selectedDay ? "oklch(94% 0.04 75)" : "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 500, marginBottom: 2 }}>
                {weekDayLabel(d).split(" ")[0]}
              </p>
              <p style={{ fontSize: 17, fontWeight: 700, color: i === selectedDay ? "white" : "var(--text)", fontFamily: "var(--font-poppins)" }}>
                {d.getDate()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{ background: "oklch(97% 0.04 75)", border: "1px solid oklch(88% 0.06 75)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Info size={14} color="var(--gold)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
          Clique em um agendamento para expandir e <strong>editar</strong> ou <strong>alterar o status</strong>.
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: "var(--border)" }} />)}
        </div>
      )}

      {!loading && appts.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>
          Nenhum agendamento para este dia.
        </div>
      )}

      {!loading && appts.map(a => (
        <ApptCard key={a.id} appt={a} onUpdate={update} onDelete={deleteAppt} />
      ))}
    </div>
  );
}
