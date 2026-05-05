"use client";

import { useState } from "react";
import type { Appointment } from "@/types";
import { allTimes, allServiceNames, statusList } from "@/lib/data";

interface Props {
  onSave: (a: Appointment) => void;
  onClose: () => void;
}

export function NewApptModal({ onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<Appointment>>({
    name: "", phone: "", svc: allServiceNames[0], time: "09:00",
    price: 0, location: "salon", payment: "pix", status: "confirmado",
  });
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name && form.time && form.price;

  const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", background: "white", outline: "none" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "oklch(22% 0.04 340 / 0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px oklch(22% 0.04 340 / 0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--text)" }}>Novo Agendamento</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-light)", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { l: "Nome da Cliente *", k: "name", placeholder: "Ex: Fernanda Silva" },
            { l: "Telefone / WhatsApp", k: "phone", placeholder: "(11) 99999-0000" },
          ].map(f => (
            <div key={f.k}>
              <label style={labelStyle}>{f.l}</label>
              <input placeholder={f.placeholder} value={String(form[f.k as keyof typeof form] || "")} onChange={e => set(f.k, e.target.value)} style={fieldStyle} />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Serviço *</label>
              <select value={form.svc} onChange={e => set("svc", e.target.value)} style={fieldStyle}>
                {allServiceNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Horário *</label>
              <select value={form.time} onChange={e => set("time", e.target.value)} style={fieldStyle}>
                {allTimes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valor (R$) *</label>
              <input type="number" placeholder="0" value={form.price || ""} onChange={e => set("price", Number(e.target.value))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Local</label>
              <select value={form.location} onChange={e => set("location", e.target.value)} style={fieldStyle}>
                <option value="salon">No Salão</option>
                <option value="home">Em Casa</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <select value={form.payment} onChange={e => set("payment", e.target.value)} style={fieldStyle}>
                <option value="pix">Pix</option>
                <option value="credit">Cartão</option>
                <option value="local">Presencial</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={fieldStyle}>
                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={!valid}
            onClick={() => valid && onSave({ ...(form as Appointment), id: Date.now(), price: Number(form.price) })}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: valid ? "var(--gold)" : "var(--border)", cursor: valid ? "pointer" : "not-allowed", fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: "white" }}>
            Confirmar Agendamento
          </button>
          <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-mid)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
