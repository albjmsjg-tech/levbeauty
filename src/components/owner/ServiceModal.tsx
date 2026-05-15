"use client";

import { useState } from "react";
import type { Service, Input } from "@/types";
import { computeUnitCost } from "@/lib/utils";

interface Props {
  svc: Service | null;
  allInputs: Input[];
  onSave: (s: Service) => void;
  onClose: () => void;
}

export function ServiceModal({ svc, allInputs, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Service>(svc ?? {
    id: Date.now(), name: "", emoji: "", duration: "1h", price: 0, active: true, inputs: [],
  });
  const set = (k: string, v: string | number | boolean) => setDraft(d => ({ ...d, [k]: v }));
  const toggleInput = (id: string) => setDraft(d => ({ ...d, inputs: d.inputs.includes(id) ? d.inputs.filter(i => i !== id) : [...d.inputs, id] }));
  const valid = draft.name.trim().length > 0;

  const fieldStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "oklch(22% 0.04 340 / 0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px oklch(22% 0.04 340 / 0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--text)" }}>{svc ? "Editar Serviço" : "Novo Serviço"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-light)" }}>×</button>
        </div>

        {/* Basic fields */}
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Emoji</label>
            <input value={draft.emoji} onChange={e => set("emoji", e.target.value)} maxLength={2} style={{ ...fieldStyle, fontSize: 20, textAlign: "center", padding: "9px 4px" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Nome do Serviço *</label>
            <input value={draft.name} onChange={e => set("name", e.target.value)} placeholder="Ex: Banho de Gel" style={fieldStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Duração</label>
            <input value={draft.duration} onChange={e => set("duration", e.target.value)} placeholder="Ex: 1h 30min" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Preço (R$)</label>
            <input type="number" value={draft.price} onChange={e => set("price", Number(e.target.value))} min={0} step={0.01} style={fieldStyle} />
          </div>
        </div>

        {/* Insumos */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", letterSpacing: "0.04em", marginBottom: 8 }}>INSUMOS UTILIZADOS</p>
          {allInputs.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>Nenhum insumo cadastrado ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 200, overflowY: "auto" }}>
              {allInputs.map((inp, idx) => {
                const id = inp.id ?? `fallback-${idx}`;
                const sel = draft.inputs.includes(id);
                return (
                  <div key={id} onClick={() => toggleInput(id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "oklch(98% 0.035 75)" : "white", cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{inp.name}</span>
                    <span style={{ fontSize: 11, color: sel ? "var(--gold)" : "transparent", fontWeight: 600, fontFamily: "var(--font-poppins)" }}>
                      R${computeUnitCost(inp).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button disabled={!valid} onClick={() => valid && onSave(draft)}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: valid ? "var(--gold)" : "var(--border)", cursor: valid ? "pointer" : "not-allowed", fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: "white" }}>
            {svc ? "Salvar Alterações" : "Cadastrar Serviço"}
          </button>
          <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-mid)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
