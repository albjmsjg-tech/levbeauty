"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, ClipboardList } from "lucide-react";
import { FichaAnamnese } from "@/components/clientes/FichaAnamnese";
import type { Appointment } from "@/types";
import {
  createComanda,
  updateComanda,
  deleteAppointment,
  toggleClientVip,
  toggleClientBlocked,
} from "@/app/painel/agenda/actions";
import { fmt } from "@/lib/utils";
import { statusColors, statusList, allTimes } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  emoji: string;
}

interface ClientInfo {
  id: string;
  name: string;
  isVip: boolean;
  isBlocked: boolean;
}

interface ItemDraft {
  serviceId: string;
  serviceName: string;
  price: number;
  durationMin: number;
}

const PAYMENT_OPTIONS = [
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "local", label: "Presencial" },
  { value: "outro", label: "Outro" },
];

interface Props {
  salonId: string;
  salonSlug?: string | null;
  defaultDate: string;
  services: ServiceOption[];
  editAppt?: Appointment | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ComandaModal({ salonId, salonSlug, defaultDate, services, editAppt, onClose, onSaved }: Props) {
  const isEdit = !!editAppt;

  const [date, setDate] = useState(editAppt?.date ?? defaultDate);
  const [time, setTime] = useState(editAppt?.time ?? "09:00");
  const [name, setName] = useState(editAppt?.name ?? "");
  const [phone, setPhone] = useState(editAppt?.phone ?? "");
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>(
    editAppt?.items.map(i => ({
      serviceId: i.serviceId,
      serviceName: i.serviceName,
      price: i.price,
      durationMin: i.durationMin,
    })) ?? []
  );
  const [location, setLocation] = useState<"salao" | "domicilio">(
    editAppt?.location === "home" ? "domicilio" : "salao"
  );
  const [clientCep, setClientCep] = useState(editAppt?.clientCep ?? "");
  const [travelFee, setTravelFee] = useState(editAppt?.travelFee ?? 0);
  const [payment, setPayment] = useState<Appointment["payment"]>(editAppt?.payment ?? "pix");
  const [notes, setNotes] = useState(editAppt?.notes ?? "");
  const [status, setStatus] = useState<string>(editAppt?.status ?? "pendente");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAnamnese, setShowAnamnese] = useState(false);
  const [anamneseData, setAnamneseData] = useState<{
    id: string; allergies: string | null; has_diabetes: boolean; is_pregnant: boolean;
    uses_continuous_medication: boolean; other_conditions: string | null; preferences: string | null;
    technical_history: string | null; general_notes: string | null; lgpd_consent_at: string | null;
  } | null>(null);

  const field: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)",
    fontSize: 13, color: "var(--text)", background: "white",
    outline: "none", boxSizing: "border-box",
  };

  useEffect(() => {
    if (!editAppt?.clientId) return;
    const supabase = createClient();
    supabase.from("clients").select("id, name, is_vip, is_blocked")
      .eq("id", editAppt.clientId).maybeSingle()
      .then(({ data }) => {
        if (data) setClient({ id: data.id as string, name: data.name as string, isVip: data.is_vip as boolean, isBlocked: data.is_blocked as boolean });
      });
  }, [editAppt?.clientId]);

  const lookupPhone = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setLookingUp(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("clients").select("id, name, is_vip, is_blocked, allergies, has_diabetes, is_pregnant, uses_continuous_medication, other_conditions, preferences, technical_history, general_notes, lgpd_consent_at")
      .eq("salon_id", salonId).eq("phone", digits).maybeSingle();
    if (data) {
      const cd = data as Record<string, unknown>;
      setClient({ id: cd.id as string, name: cd.name as string, isVip: cd.is_vip as boolean, isBlocked: cd.is_blocked as boolean });
      if (!name) setName(cd.name as string);
      setAnamneseData({
        id: cd.id as string,
        allergies: (cd.allergies as string | null) ?? null,
        has_diabetes: (cd.has_diabetes as boolean) ?? false,
        is_pregnant: (cd.is_pregnant as boolean) ?? false,
        uses_continuous_medication: (cd.uses_continuous_medication as boolean) ?? false,
        other_conditions: (cd.other_conditions as string | null) ?? null,
        preferences: (cd.preferences as string | null) ?? null,
        technical_history: (cd.technical_history as string | null) ?? null,
        general_notes: (cd.general_notes as string | null) ?? null,
        lgpd_consent_at: (cd.lgpd_consent_at as string | null) ?? null,
      });
    } else {
      setClient(null);
      setAnamneseData(null);
    }
    setLookingUp(false);
  };

  const handleVip = async () => {
    if (!client) return;
    await toggleClientVip(client.id);
    setClient(c => c ? { ...c, isVip: !c.isVip } : c);
  };

  const handleBlock = async () => {
    if (!client) return;
    await toggleClientBlocked(client.id);
    setClient(c => c ? { ...c, isBlocked: !c.isBlocked } : c);
  };

  const addItem = () => {
    if (items.length >= 4 || services.length === 0) return;
    const svc = services[0];
    setItems(prev => [...prev, { serviceId: svc.id, serviceName: svc.name, price: svc.price, durationMin: svc.durationMin }]);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const setItemSvc = (idx: number, id: string) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    setItems(prev => prev.map((it, i) => i === idx ? { serviceId: id, serviceName: svc.name, price: svc.price, durationMin: svc.durationMin } : it));
  };

  const setItemPrice = (idx: number, price: number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, price } : it));

  const itemsTotal = items.reduce((s, i) => s + i.price, 0);
  const grandTotal = itemsTotal + (location === "domicilio" ? (travelFee || 0) : 0);

  const handleSave = async () => {
    if (!name.trim()) { setErr("Nome do cliente é obrigatório."); return; }
    if (!phone.replace(/\D/g, "")) { setErr("Telefone é obrigatório."); return; }
    if (items.length === 0) { setErr("Adicione pelo menos um serviço."); return; }
    if (client?.isBlocked) { setErr("Cliente está bloqueada."); return; }

    setSaving(true);
    setErr(null);

    const input = {
      salonId,
      clientName: name.trim(),
      clientPhone: phone,
      date,
      time,
      items: items.map((it, i) => ({
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        price: it.price,
        durationMin: it.durationMin,
        position: i + 1,
      })),
      location,
      clientCep: location === "domicilio" ? clientCep : undefined,
      travelFee: location === "domicilio" ? (travelFee || 0) : 0,
      paymentMethod: payment === "credit" ? "credito" : payment,
      notes: notes.trim() || undefined,
      status: status === "concluído" ? "concluido" : status,
    };

    const result = isEdit && editAppt
      ? await updateComanda(String(editAppt.id), input)
      : await createComanda(input);

    if (result.ok) {
      if ((status === "concluído" || status === "concluido") && phone && salonSlug) {
        const link = `${window.location.origin}/s/${salonSlug}`;
        fetch("/api/whatsapp/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, message: `Obrigada pela visita, ${name}! 💕\nAgende sua próxima visita: ${link}` }),
        }).catch(() => {});
      }
      onSaved();
    } else {
      setErr("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editAppt) return;
    setSaving(true);
    await deleteAppointment(String(editAppt.id));
    onSaved();
  };

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>
      {text}
    </p>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "oklch(20% 0.03 340 / 0.5)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, width: "min(520px, calc(100vw - 48px))", maxHeight: "calc(100vh - 64px)", overflowY: "auto", background: "white", borderRadius: 20, boxShadow: "0 20px 60px oklch(20% 0.04 340 / 0.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.06em", marginBottom: 4 }}>
              {isEdit ? "EDITAR COMANDA" : "NOVA COMANDA"}
            </p>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--text)", margin: 0 }}>
              {isEdit ? (editAppt?.name || "Comanda") : "Novo Agendamento"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color="var(--text-mid)" />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* Data e Hora */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("DATA E HORA")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Horário</label>
                <select value={time} onChange={e => setTime(e.target.value)} style={field}>
                  {allTimes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("CLIENTE")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Telefone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onBlur={lookupPhone} placeholder="(11) 99999-0000" style={field} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da cliente" style={field} />
              </div>
            </div>
            {lookingUp && (
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontStyle: "italic" }}>Buscando cliente...</p>
            )}
            {client && (
              <div style={{ borderRadius: 8, background: client.isBlocked ? "oklch(97% 0.03 15)" : "#F6F2EC", border: `1px solid ${client.isBlocked ? "oklch(88% 0.05 15)" : "#C9C4BC"}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px" }}>
                  <span style={{ fontSize: 12, color: client.isBlocked ? "oklch(48% 0.14 15)" : "oklch(38% 0.1 145)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>
                    {client.isBlocked ? "⛔ Cliente bloqueada" : "✓ Cliente cadastrada"}
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={handleVip} style={{ padding: "4px 10px", borderRadius: 8, border: `1.5px solid ${client.isVip ? "var(--gold)" : "var(--border)"}`, background: client.isVip ? "#F6F2EC" : "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: client.isVip ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                      ⭐ VIP
                    </button>
                    <button onClick={handleBlock} style={{ padding: "4px 10px", borderRadius: 8, border: `1.5px solid ${client.isBlocked ? "oklch(88% 0.05 15)" : "var(--border)"}`, background: client.isBlocked ? "oklch(97% 0.03 15)" : "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: client.isBlocked ? "oklch(48% 0.14 15)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                      🚫 Bloquear
                    </button>
                  </div>
                </div>
                {anamneseData && (
                  <div style={{ borderTop: `1px solid ${client.isBlocked ? "oklch(88% 0.05 15)" : "#C9C4BC"}`, padding: "6px 12px" }}>
                    <button
                      onClick={() => setShowAnamnese(true)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                      <ClipboardList size={13} /> Ver / editar anamnese
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comanda */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("COMANDA")}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={item.serviceId} onChange={e => setItemSvc(idx, e.target.value)} style={{ ...field, flex: 1 }}>
                    {services.map(s => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>)}
                  </select>
                  <input type="number" min={0} step={0.01} value={item.price || ""} onChange={e => setItemPrice(idx, Number(e.target.value) || 0)} style={{ ...field, width: 90 }} />
                  <button onClick={() => removeItem(idx)} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: "1.5px solid oklch(88% 0.05 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={13} color="oklch(48% 0.14 15)" />
                  </button>
                </div>
              ))}
            </div>
            {items.length < 4 && services.length > 0 && (
              <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1.5px dashed var(--border)", background: "white", cursor: "pointer", fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", fontWeight: 500 }}>
                <Plus size={13} /> Adicionar serviço
              </button>
            )}
            <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, background: "oklch(22% 0.04 340)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-poppins)" }}>Total da comanda</span>
              <strong style={{ fontSize: 18, color: "var(--gold)", fontFamily: "var(--font-playfair)" }}>{fmt(grandTotal)}</strong>
            </div>
          </div>

          {/* Local */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("LOCAL")}
            <div style={{ display: "flex", gap: 8, marginBottom: location === "domicilio" ? 10 : 0 }}>
              {(["salao", "domicilio"] as const).map(loc => (
                <button key={loc} onClick={() => setLocation(loc)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1.5px solid ${location === loc ? "var(--gold)" : "var(--border)"}`, background: location === loc ? "#F6F2EC" : "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: location === loc ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                  {loc === "salao" ? "🏠 No salão" : "🚗 A domicílio"}
                </button>
              ))}
            </div>
            {location === "domicilio" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>CEP da cliente</label>
                  <input type="text" value={clientCep} onChange={e => setClientCep(e.target.value)} placeholder="00000-000" style={field} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Taxa deslocamento (R$)</label>
                  <input type="number" min={0} step={0.01} value={travelFee || ""} onChange={e => setTravelFee(Number(e.target.value) || 0)} placeholder="0,00" style={field} />
                </div>
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("PAGAMENTO")}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setPayment(opt.value as Appointment["payment"])} style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${payment === opt.value ? "var(--gold)" : "var(--border)"}`, background: payment === opt.value ? "#F6F2EC" : "white", cursor: "pointer", fontSize: 12, fontWeight: payment === opt.value ? 700 : 500, color: payment === opt.value ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("OBSERVAÇÕES")}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferências, alergias, informações importantes..." rows={3} style={{ ...field, resize: "vertical" }} />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 24 }}>
            {sectionLabel("STATUS")}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statusList.map(s => {
                const sc = statusColors[s];
                const active = status === s || (status === "concluido" && s === "concluído");
                return (
                  <button key={s} onClick={() => setStatus(s)} style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${active ? sc.color : "var(--border)"}`, background: active ? sc.bg : "white", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? sc.color : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                    {active && "✓ "}{s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {err && (
            <p style={{ fontSize: 12, color: "oklch(48% 0.14 15)", fontFamily: "var(--font-poppins)", marginBottom: 14, padding: "8px 12px", background: "oklch(97% 0.03 15)", borderRadius: 8, border: "1px solid oklch(88% 0.05 15)" }}>
              {err}
            </p>
          )}

          {/* Footer */}
          <div style={{ display: "flex", gap: 10 }}>
            {isEdit && (
              <button onClick={handleDelete} disabled={saving} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid oklch(88% 0.05 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "oklch(48% 0.14 15)", fontFamily: "var(--font-poppins)" }}>
                🗑️
              </button>
            )}
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (client?.isBlocked ?? false)}
              style={{ flex: 2, padding: 10, borderRadius: 10, border: "none", background: client?.isBlocked ? "var(--border)" : "var(--gold)", cursor: client?.isBlocked ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "var(--font-poppins)", boxShadow: client?.isBlocked ? "none" : "0 4px 14px rgba(184,154,143,0.2)" }}>
              {saving ? "Salvando..." : `Salvar Comanda · ${fmt(grandTotal)}`}
            </button>
          </div>
        </div>
      </div>
      {/* Modal anamnese inline */}
      {showAnamnese && anamneseData && (
        <>
          <div onClick={() => setShowAnamnese(false)} style={{ position: "fixed", inset: 0, background: "oklch(20% 0.03 340 / 0.6)", zIndex: 200, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201, width: "min(520px, calc(100vw - 48px))", maxHeight: "calc(100vh - 64px)", overflowY: "auto", background: "white", borderRadius: 20, boxShadow: "0 20px 60px oklch(20% 0.04 340 / 0.3)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", margin: 0 }}>Anamnese</h2>
              </div>
              <button onClick={() => setShowAnamnese(false)} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} color="var(--text-mid)" />
              </button>
            </div>
            <FichaAnamnese client={anamneseData} onClose={() => setShowAnamnese(false)} />
          </div>
        </>
      )}
    </>
  );
}
