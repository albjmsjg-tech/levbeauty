"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ApptCard } from "@/components/owner/ApptCard";
import { NewApptModal } from "@/components/owner/NewApptModal";
import type { Appointment } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { mapDbAppt, apptToDbRow, getOwnerSalon, getWeekDates, weekDayLabel, toISODate } from "@/lib/supabase/queries";
import { statusColors, statusList, allTimes, allServiceNames } from "@/lib/data";
import { fmt } from "@/lib/utils";

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function weekRangeLabel(weekDates: Date[], weekOffset: number): string {
  if (weekOffset === 0) return "Semana atual";
  if (weekOffset === -1) return "Semana passada";
  if (weekOffset === 1) return "Próxima semana";
  const first = weekDates[0];
  const last = weekDates[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${MONTHS_SHORT[first.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ApptModal({
  appt,
  onClose,
  onUpdate,
  onDelete,
}: {
  appt: Appointment;
  onClose: () => void;
  onUpdate: (a: Appointment) => void;
  onDelete: (id: number | string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Appointment>({ ...appt });

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid var(--border)",
    fontFamily: "var(--font-poppins)",
    fontSize: 13,
    color: "var(--text)",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  };

  const saveEdit = () => { onUpdate(draft); setEditing(false); };

  const handleDelete = () => { onDelete(appt.id); onClose(); };

  const sc = statusColors[appt.status] || statusColors.pendente;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "oklch(20% 0.03 340 / 0.5)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, width: "min(520px, calc(100vw - 48px))", maxHeight: "calc(100vh - 64px)", overflowY: "auto", background: "white", borderRadius: 20, boxShadow: "0 20px 60px oklch(20% 0.04 340 / 0.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.06em", marginBottom: 4 }}>AGENDAMENTO · {appt.time}</p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--text)", margin: 0 }}>{appt.name}</h2>
            <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>{appt.svc}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={14} color="var(--text-mid)" />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {!editing ? (
            <>
              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { l: "Valor", v: fmt(appt.price) },
                  { l: "Horário", v: appt.time },
                  { l: "Telefone", v: appt.phone || "—" },
                  { l: "Local", v: appt.location === "home" ? "Em Casa" : "No Salão" },
                  { l: "Pagamento", v: { pix: "Pix", credit: "Cartão", local: "Presencial" }[appt.payment] || appt.payment },
                  { l: "Status", v: appt.status },
                ].map((r, i) => (
                  <div key={i} style={{ background: "oklch(98% 0.01 75)", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 3, fontWeight: 500, letterSpacing: "0.04em" }}>{r.l.toUpperCase()}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: r.l === "Status" ? sc.color : "var(--text)", fontFamily: "var(--font-poppins)" }}>{r.v}</p>
                  </div>
                ))}
              </div>

              {/* Status buttons */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.06em" }}>ALTERAR STATUS</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {statusList.map(s => {
                    const c = statusColors[s];
                    const active = appt.status === s;
                    return (
                      <button key={s} onClick={() => onUpdate({ ...appt, status: s })}
                        style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${active ? c.color : "var(--border)"}`, background: active ? c.bg : "white", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? c.color : "var(--text-mid)", fontFamily: "var(--font-poppins)", transition: "all 0.15s" }}>
                        {active && "✓ "}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => { setDraft({ ...appt }); setEditing(true); }}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                  ✏️ Editar
                </button>
                <button onClick={handleDelete}
                  style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid oklch(88% 0.05 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "oklch(48% 0.14 15)", fontFamily: "var(--font-poppins)" }}>
                  🗑️ Excluir
                </button>
              </div>
            </>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 14, fontWeight: 600, letterSpacing: "0.06em" }}>EDITANDO AGENDAMENTO</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[
                  { l: "Nome", key: "name" },
                  { l: "Telefone", key: "phone" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>{f.l}</label>
                    <input value={String(draft[f.key as keyof Appointment])} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={fieldStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Horário</label>
                  <select value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} style={fieldStyle}>
                    {allTimes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Serviço</label>
                  <select value={draft.svc} onChange={e => setDraft(d => ({ ...d, svc: e.target.value }))} style={fieldStyle}>
                    {allServiceNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Valor (R$)</label>
                  <input type="number" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) }))} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Local</label>
                  <select value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value as "salon" | "home" }))} style={fieldStyle}>
                    <option value="salon">No Salão</option>
                    <option value="home">Em Casa</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.3)" }}>Salvar</button>
                <button onClick={() => setEditing(false)} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const [salonId, setSalonId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalAppt, setModalAppt] = useState<Appointment | null>(null);

  const weekDates = getWeekDates(weekOffset);
  const selectedDate = toISODate(weekDates[selectedDay]);

  useEffect(() => {
    const supabase = createClient();
    getOwnerSalon(supabase).then(salon => {
      if (salon) setSalonId(salon.id as string);
    });
  }, []);

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
    setModalAppt(prev => prev?.id === updated.id ? updated : prev);
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
    setModalAppt(null);
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
    setShowNewModal(false);
  };

  const navigateWeek = (delta: number) => {
    setWeekOffset(w => w + delta);
    // When jumping to the current week, snap selection to today's weekday
    if (weekOffset + delta === 0) setSelectedDay(new Date().getDay());
  };

  const dayRevTotal = appts.filter(a => a.status !== "cancelado").reduce((s, a) => s + Number(a.price), 0);

  return (
    <div style={{ padding: "28px 32px" }}>
      {showNewModal && <NewApptModal onSave={addAppt} onClose={() => setShowNewModal(false)} />}
      {modalAppt && (
        <ApptModal
          appt={modalAppt}
          onClose={() => setModalAppt(null)}
          onUpdate={update}
          onDelete={deleteAppt}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Agenda</h1>
          <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>
            {loading ? "Carregando..." : `${appts.length} agendamento${appts.length !== 1 ? "s" : ""} · receita prevista `}
            {!loading && <strong style={{ color: "var(--gold)" }}>{fmt(dayRevTotal)}</strong>}
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
          <Plus size={15} color="white" /> Novo Agendamento
        </button>
      </div>

      {/* Week navigation + Day picker */}
      <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid var(--border)", marginBottom: 20 }}>
        {/* Week nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={() => navigateWeek(-1)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} color="var(--text-mid)" />
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", margin: 0 }}>
              {weekRangeLabel(weekDates, weekOffset)}
            </p>
            {weekOffset !== 0 && (
              <button onClick={() => { setWeekOffset(0); setSelectedDay(new Date().getDay()); }}
                style={{ fontSize: 10, color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
                Ir para hoje
              </button>
            )}
          </div>
          <button onClick={() => navigateWeek(1)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} color="var(--text-mid)" />
          </button>
        </div>

        {/* Day pills */}
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
                {isToday && (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: i === selectedDay ? "white" : "var(--gold)", margin: "2px auto 0" }} />
                )}
              </button>
            );
          })}
        </div>
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
        <ApptCard key={a.id} appt={a} onUpdate={update} onDelete={deleteAppt} onOpen={setModalAppt} />
      ))}
    </div>
  );
}
