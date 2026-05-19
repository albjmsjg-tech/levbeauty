"use client";

import { useState } from "react";
import type { Appointment } from "@/types";
import { allTimes, statusList } from "@/lib/data";

interface Props {
  onSave: (a: Appointment) => void;
  onClose: () => void;
}

export function NewApptModal({ onSave, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState<"salon" | "home">("salon");
  const [payment, setPayment] = useState<Appointment["payment"]>("pix");
  const [status, setStatus] = useState<Appointment["status"]>("confirmado");

  const valid = name.trim() && time;

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
          <div>
            <label style={labelStyle}>Nome da Cliente *</label>
            <input placeholder="Ex: Fernanda Silva" value={name} onChange={e => setName(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Telefone / WhatsApp</label>
            <input placeholder="(11) 99999-0000" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Horário *</label>
              <select value={time} onChange={e => setTime(e.target.value)} style={fieldStyle}>
                {allTimes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Local</label>
              <select value={location} onChange={e => setLocation(e.target.value as "salon" | "home")} style={fieldStyle}>
                <option value="salon">No Salão</option>
                <option value="home">Em Casa</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <select value={payment} onChange={e => setPayment(e.target.value as Appointment["payment"])} style={fieldStyle}>
                <option value="pix">Pix</option>
                <option value="credit">Cartão</option>
                <option value="local">Presencial</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Appointment["status"])} style={fieldStyle}>
                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={!valid}
            onClick={() => valid && onSave({ id: Date.now(), name: name.trim(), phone, time, status, totalPrice: 0, travelFee: 0, location, payment, items: [] })}
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
