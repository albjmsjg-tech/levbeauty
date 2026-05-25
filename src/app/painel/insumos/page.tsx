"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import type { Input } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { getOwnerSalon, mapDbInput } from "@/lib/supabase/queries";
import { fmt, computeUnitCost } from "@/lib/utils";
import { unitOptions } from "@/lib/data";

function InsumoRow({ inp, onSave, onDelete }: { inp: Input; onSave: (i: Input) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Input>({ ...inp });
  const set = (k: keyof Input, v: string | number) => setDraft(d => ({ ...d, [k]: v }));
  const cost = computeUnitCost(inp);

  const inputStyle: React.CSSProperties = { padding: "6px 8px", borderRadius: 7, border: "1.5px solid var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text)", outline: "none", background: "oklch(99% 0.02 75)" };
  const cellStyle: React.CSSProperties = { padding: "11px 14px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" };

  if (editing) {
    return (
      <tr style={{ background: "oklch(98% 0.03 75)" }}>
        <td style={cellStyle}><input value={draft.name} onChange={e => set("name", e.target.value)} style={{ ...inputStyle, minWidth: 140, width: "100%" }} /></td>
        <td style={cellStyle}>
          <div style={{ display: "flex", gap: 4 }}>
            <input type="number" value={draft.pkgQty} onChange={e => set("pkgQty", Number(e.target.value))} style={{ ...inputStyle, width: 60 }} />
            <select value={draft.unit} onChange={e => set("unit", e.target.value)} style={{ ...inputStyle, width: 52, padding: "6px 4px" }}>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </td>
        <td style={cellStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>R$</span>
            <input type="number" value={draft.pkgCost} onChange={e => set("pkgCost", Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
          </div>
        </td>
        <td style={cellStyle}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="number" step="0.01" value={draft.perApplication} onChange={e => set("perApplication", Number(e.target.value))} style={{ ...inputStyle, width: 60 }} />
            <span style={{ fontSize: 11, color: "var(--text-light)" }}>{draft.unit}</span>
          </div>
        </td>
        <td style={cellStyle}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(computeUnitCost(draft))}</span></td>
        <td style={cellStyle}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { onSave(draft); setEditing(false); }} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Salvar</button>
            <button onClick={() => { setDraft({ ...inp }); setEditing(false); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>✕</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "oklch(99% 0.015 75)")}
      onMouseLeave={e => (e.currentTarget.style.background = "white")}>
      <td style={{ ...cellStyle, fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{inp.name}</td>
      <td style={{ ...cellStyle, fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{inp.pkgQty} {inp.unit}</td>
      <td style={{ ...cellStyle, fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{fmt(inp.pkgCost)}</td>
      <td style={{ ...cellStyle, fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{inp.perApplication} {inp.unit}</td>
      <td style={{ ...cellStyle, fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(cost)}</td>
      <td style={cellStyle}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(true)} style={{ padding: "5px 14px", borderRadius: 7, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>✏️ Editar</button>
          <button onClick={() => inp.id && onDelete(inp.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid oklch(90% 0.04 15)", background: "oklch(99% 0.01 15)", cursor: "pointer", fontSize: 11, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)" }}>🗑️</button>
        </div>
      </td>
    </tr>
  );
}

export default function InsumosPage() {
  const [salonId, setSalonId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [loading, setLoading] = useState(true);
  const [opError, setOpError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newInp, setNewInp] = useState<Input>({ name: "", unit: "ml", pkgQty: 0, pkgCost: 0, perApplication: 0 });

  useEffect(() => {
    const supabase = createClient();
    getOwnerSalon(supabase).then(async salon => {
      if (!salon) { setLoading(false); return; }
      const id = salon.id as string;
      setSalonId(id);
      const { data, error } = await supabase.from("inputs").select("*").eq("salon_id", id).order("name");
      if (error) setOpError(error.message);
      setInputs((data ?? []).map(r => mapDbInput(r as Record<string, unknown>)));
      setLoading(false);
    });
  }, []);

  const setN = (k: keyof Input, v: string | number) => setNewInp(d => ({ ...d, [k]: v }));

  const saveEdit = useCallback(async (updated: Input) => {
    if (!updated.id) return;
    setInputs(prev => prev.map(i => i.id === updated.id ? updated : i));
    const supabase = createClient();
    const { error } = await supabase.from("inputs").update({
      name: updated.name.trim(),
      unit: updated.unit,
      pkg_qty: updated.pkgQty,
      pkg_cost: updated.pkgCost,
      per_application: updated.perApplication,
    }).eq("id", updated.id);
    if (error) {
      setOpError(error.message);
      setInputs(prev => prev.map(i => i.id === updated.id ? { ...i } : i));
    }
  }, []);

  const deleteInp = useCallback(async (id: string) => {
    setInputs(prev => prev.filter(i => i.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("inputs").delete().eq("id", id);
    if (error) {
      setOpError(error.message);
      const supabase2 = createClient();
      const salon = await getOwnerSalon(supabase2);
      if (salon) {
        const { data } = await supabase2.from("inputs").select("*").eq("salon_id", salon.id as string).order("name");
        setInputs((data ?? []).map(r => mapDbInput(r as Record<string, unknown>)));
      }
    }
  }, []);

  const addInp = async () => {
    if (!newInp.name.trim() || !salonId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("inputs").insert({
      salon_id: salonId,
      name: newInp.name.trim(),
      unit: newInp.unit,
      pkg_qty: newInp.pkgQty,
      pkg_cost: newInp.pkgCost,
      per_application: newInp.perApplication,
    }).select("*").single();
    if (error) { setOpError(error.message); return; }
    if (data) setInputs(prev => [...prev, mapDbInput(data as Record<string, unknown>)]);
    setNewInp({ name: "", unit: "ml", pkgQty: 0, pkgCost: 0, perApplication: 0 });
    setAdding(false);
  };

  const inputStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text)", outline: "none", width: "100%" };

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Gestão de Insumos</h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>Clique em Editar para modificar qualquer insumo diretamente na tabela</p>
        </div>
        <button onClick={() => setAdding(v => !v)} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px rgba(184,154,143,0.25)" }}>
          <Plus size={14} color="white" /> Novo Insumo
        </button>
      </div>

      {opError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "oklch(94% 0.04 15)", border: "1px solid oklch(88% 0.08 15)", fontSize: 12, color: "oklch(42% 0.12 15)", fontFamily: "var(--font-poppins)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{opError}</span>
          <button onClick={() => setOpError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "oklch(42% 0.12 15)", lineHeight: 1 }}>×</button>
        </div>
      )}

      {adding && (
        <div style={{ background: "oklch(98% 0.03 75)", borderRadius: 14, padding: "16px 18px", border: "1.5px solid var(--gold)", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", letterSpacing: "0.04em", marginBottom: 10 }}>NOVO INSUMO</p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Nome</label>
              <input value={newInp.name} onChange={e => setN("name", e.target.value)} placeholder="Ex: Builder Gel" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Qtd/Pacote</label>
              <div style={{ display: "flex", gap: 4 }}>
                <input type="number" value={newInp.pkgQty || ""} onChange={e => setN("pkgQty", Number(e.target.value))} placeholder="0" style={{ ...inputStyle, width: 55 }} />
                <select value={newInp.unit} onChange={e => setN("unit", e.target.value)} style={{ ...inputStyle, width: 48, padding: "7px 4px" }}>
                  {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Custo Pacote (R$)</label>
              <input type="number" value={newInp.pkgCost || ""} onChange={e => setN("pkgCost", Number(e.target.value))} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Uso/Aplicação</label>
              <input type="number" step="0.01" value={newInp.perApplication || ""} onChange={e => setN("perApplication", Number(e.target.value))} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 4 }}>Custo/Aplic.</label>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)", padding: "8px 0" }}>{fmt(computeUnitCost(newInp))}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addInp} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Adicionar</button>
            <button onClick={() => setAdding(false)} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--border)", overflow: "clip" }}>
        <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-poppins)" }}>
          <thead>
            <tr style={{ background: "oklch(98% 0.015 75)", borderBottom: "1px solid var(--border)" }}>
              {["Produto", "Qtd/Pacote", "Custo Pacote", "Uso/Aplicação", "Custo/Aplicação", "Ações"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-light)", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>Carregando…</td></tr>
            ) : (
              inputs.map(inp => (
                <InsumoRow key={inp.id} inp={inp} onSave={saveEdit} onDelete={deleteInp} />
              ))
            )}
          </tbody>
        </table>
        </div>
        {!loading && inputs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>Nenhum insumo cadastrado.</div>
        )}
      </div>
    </div>
  );
}
