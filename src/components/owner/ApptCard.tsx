"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Appointment } from "@/types";
import { statusColors, statusList, allTimes, allServiceNames } from "@/lib/data";
import { fmt } from "@/lib/utils";

function StatusBadge({ status, onClick }: { status: string; onClick?: (e: React.MouseEvent) => void }) {
  const s = statusColors[status] || statusColors.pendente;
  return (
    <span onClick={onClick} style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "4px 11px", borderRadius: 10, background: s.bg, color: s.color, cursor: onClick ? "pointer" : "default", border: onClick ? `1.5px solid ${s.color}40` : "none", userSelect: "none", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

interface Props {
  appt: Appointment;
  onUpdate: (a: Appointment) => void;
  onDelete: (id: number | string) => void;
}

export function ApptCard({ appt, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Appointment>({ ...appt });

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = statusList.indexOf(appt.status as typeof statusList[number]);
    onUpdate({ ...appt, status: statusList[(idx + 1) % statusList.length] });
  };

  const saveEdit = () => { onUpdate(draft); setEditing(false); };

  const fieldStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text)", background: "white", outline: "none" };

  return (
    <div style={{ marginBottom: 10 }}>
      <div onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", gap: 14, alignItems: "stretch", cursor: "pointer", background: "white", borderRadius: 14, border: `1.5px solid ${expanded ? "var(--gold)" : "var(--border)"}`, overflow: "hidden", boxShadow: expanded ? "0 4px 18px oklch(72% 0.115 75 / 0.12)" : "0 1px 4px oklch(40% 0.04 340 / 0.05)", transition: "all 0.2s" }}>
        <div style={{ width: 64, background: expanded ? "var(--gold)" : "oklch(98% 0.015 75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px 0", flexShrink: 0, transition: "background 0.2s" }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-poppins)", color: expanded ? "white" : "var(--text)", lineHeight: 1 }}>{appt.time}</span>
        </div>
        <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.name}</p>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>{appt.svc}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(appt.price)}</span>
            <StatusBadge status={appt.status} onClick={cycleStatus} />
            <div style={{ transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "none" }}>
              <ChevronRight size={14} color="var(--text-light)" />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ background: "white", borderRadius: "0 0 14px 14px", border: "1.5px solid var(--gold)", borderTop: "none", padding: "16px 18px", marginTop: -2 }}>
          {!editing ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { l: "Telefone", v: appt.phone },
                  { l: "Local", v: appt.location === "home" ? "Em Casa" : "No Salão" },
                  { l: "Pagamento", v: { pix: "Pix", credit: "Cartão", local: "Presencial" }[appt.payment] || appt.payment },
                  { l: "Valor", v: fmt(appt.price) },
                ].map((r, i) => (
                  <div key={i} style={{ background: "oklch(98% 0.01 75)", borderRadius: 8, padding: "8px 12px" }}>
                    <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 2 }}>{r.l}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{r.v}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 8, fontWeight: 500, letterSpacing: "0.04em" }}>ALTERAR STATUS</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {statusList.map(s => {
                    const sc = statusColors[s];
                    return (
                      <button key={s} onClick={() => onUpdate({ ...appt, status: s })}
                        style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${appt.status === s ? sc.color : "var(--border)"}`, background: appt.status === s ? sc.bg : "white", cursor: "pointer", fontSize: 11, fontWeight: appt.status === s ? 700 : 400, color: appt.status === s ? sc.color : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                        {appt.status === s && "✓ "}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => { setDraft({ ...appt }); setEditing(true); }}
                  style={{ flex: 1, padding: 9, borderRadius: 9, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                  ✏️ Editar
                </button>
                <button onClick={() => onDelete(appt.id)}
                  style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid oklch(90% 0.04 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)" }}>
                  🗑️ Excluir
                </button>
              </div>
            </>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 12, fontWeight: 500, letterSpacing: "0.04em" }}>EDITANDO AGENDAMENTO</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {[
                  { l: "Nome", key: "name", type: "text" },
                  { l: "Telefone", key: "phone", type: "text" },
                ] .map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>{f.l}</label>
                    <input value={String(draft[f.key as keyof Appointment])} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={fieldStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Horário</label>
                  <select value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} style={fieldStyle}>
                    {allTimes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Serviço</label>
                  <select value={draft.svc} onChange={e => setDraft(d => ({ ...d, svc: e.target.value }))} style={fieldStyle}>
                    {allServiceNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Valor (R$)</label>
                  <input type="number" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) }))} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Local</label>
                  <select value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value as "salon" | "home" }))} style={fieldStyle}>
                    <option value="salon">No Salão</option>
                    <option value="home">Em Casa</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, padding: 9, borderRadius: 9, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Salvar Alterações</button>
                <button onClick={() => setEditing(false)} style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
