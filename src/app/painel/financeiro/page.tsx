"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, BarChart3, Calendar, ChevronRight } from "lucide-react";
import type { FixedCost } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { mapDbCost, getOwnerSalon } from "@/lib/supabase/queries";
import { fmt } from "@/lib/utils";

function CostRow({ cost, onSave, onDelete }: { cost: FixedCost; onSave: (c: FixedCost) => void; onDelete: (id: number | string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cost.name);
  const [val, setVal] = useState(cost.val);

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
        <input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$</span>
          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} style={{ width: 90, padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", textAlign: "right" }} />
        </div>
        <button onClick={() => { onSave({ ...cost, name, val }); setEditing(false); }} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Salvar</button>
        <button onClick={() => { setName(cost.name); setVal(cost.val); setEditing(false); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>✕</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}
      onMouseEnter={e => { const el = e.currentTarget.querySelector<HTMLElement>(".row-actions"); if (el) el.style.opacity = "1"; }}
      onMouseLeave={e => { const el = e.currentTarget.querySelector<HTMLElement>(".row-actions"); if (el) el.style.opacity = "0"; }}>
      <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{cost.name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{fmt(cost.val)}</span>
        <div className="row-actions" style={{ display: "flex", gap: 5, opacity: 0, transition: "opacity 0.15s" }}>
          <button onClick={() => setEditing(true)} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>✏️</button>
          <button onClick={() => onDelete(cost.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid oklch(90% 0.04 15)", background: "oklch(99% 0.01 15)", cursor: "pointer", fontSize: 10, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)" }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [salonId, setSalonId] = useState<string | null>(null);
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVal, setNewVal] = useState("");
  const [exportModal, setExportModal] = useState(false);

  // Load salon + data
  useEffect(() => {
    const supabase = createClient();
    getOwnerSalon(supabase).then(async salon => {
      if (!salon) { setLoading(false); return; }
      const id = salon.id as string;
      setSalonId(id);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const [{ data: costRows }, { data: apptRows }] = await Promise.all([
        supabase.from("fixed_costs").select("*").eq("salon_id", id).order("created_at"),
        supabase.from("appointments").select("price").eq("salon_id", id).gte("appt_date", firstDay).lte("appt_date", lastDay).neq("status", "cancelado"),
      ]);

      setCosts((costRows ?? []).map(r => mapDbCost(r as Record<string, unknown>)));
      setMonthRevenue((apptRows ?? []).reduce((s, r) => s + Number(r.price), 0));
      setLoading(false);
    });
  }, []);

  const totalFixed = costs.reduce((a, c) => a + c.val, 0);
  const resultado   = monthRevenue - totalFixed;

  const saveCost = useCallback(async (updated: FixedCost) => {
    setCosts(prev => prev.map(c => c.id === updated.id ? updated : c));
    const supabase = createClient();
    const { error } = await supabase.from("fixed_costs").update({ name: updated.name, amount: updated.val }).eq("id", updated.id);
    if (error) setCosts(prev => prev.map(c => c.id === updated.id ? { ...c } : c));
  }, []);

  const deleteCost = useCallback(async (id: number | string) => {
    const prev = costs;
    setCosts(p => p.filter(c => c.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("fixed_costs").delete().eq("id", id);
    if (error) setCosts(prev);
  }, [costs]);

  const addCost = async () => {
    if (!newName.trim() || !newVal || !salonId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("fixed_costs")
      .insert({ salon_id: salonId, name: newName.trim(), amount: Number(newVal) })
      .select("*")
      .single();
    if (!error && data) {
      setCosts(prev => [...prev, mapDbCost(data as Record<string, unknown>)]);
    }
    setNewName(""); setNewVal(""); setAdding(false);
  };

  const exportCSV = async (period: "weekly" | "monthly") => {
    if (!salonId) return;
    const supabase = createClient();
    const now = new Date();
    let firstDay: string, lastDay: string, label: string, dateLabel: string;

    if (period === "weekly") {
      const dow = now.getDay();
      const sun = new Date(now); sun.setDate(now.getDate() - dow); sun.setHours(0,0,0,0);
      const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
      firstDay  = sun.toISOString().split("T")[0];
      lastDay   = sat.toISOString().split("T")[0];
      label     = "Semanal";
      dateLabel = `${sun.toLocaleDateString("pt-BR")} - ${sat.toLocaleDateString("pt-BR")}`;
    } else {
      firstDay  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      lastDay   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      label     = "Mensal";
      dateLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }

    const { data: appts } = await supabase
      .from("appointments")
      .select("appt_date, client_name, service_name, payment_method, price")
      .eq("salon_id", salonId)
      .gte("appt_date", firstDay)
      .lte("appt_date", lastDay)
      .neq("status", "cancelado")
      .order("appt_date");

    const rows = appts ?? [];
    const totalRec = rows.reduce((s, r) => s + Number(r.price), 0);

    const lines = [
      `LEVBEAUTY — RELATORIO ${label.toUpperCase()}`,
      `Periodo: ${dateLabel}`,
      "",
      "Data,Cliente,Servico,Pagamento,Valor (R$)",
      ...rows.map(r => `${r.appt_date},${r.client_name},${r.service_name},${r.payment_method ?? ""},${Number(r.price).toFixed(2)}`),
      "",
      `Total Atendimentos,${rows.length}`,
      `Receita Total,${totalRec.toFixed(2)}`,
      "",
      "CUSTOS FIXOS DO MES",
      "Item,Valor (R$)",
      ...costs.map(c => `${c.name},${c.val.toFixed(2)}`),
      `Total Custos,${totalFixed.toFixed(2)}`,
      "",
      `RESULTADO,${(totalRec - totalFixed).toFixed(2)}`,
    ];

    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LevBeauty_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModal(false);
  };

  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* Export Modal */}
      {exportModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(22% 0.04 340 / 0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px oklch(22% 0.04 340 / 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--text)" }}>Exportar Relatório</h2>
              <button onClick={() => setExportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-light)", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginBottom: 20, lineHeight: 1.6 }}>Dados reais do banco. Compatível com Excel e Google Sheets.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { period: "weekly" as const, label: "Relatório Semanal", sub: "Esta semana", icon: Calendar },
                { period: "monthly" as const, label: "Relatório Mensal", sub: monthLabel, icon: BarChart3 },
              ]).map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.period} onClick={() => exportCSV(opt.period)}
                    style={{ padding: "16px 20px", borderRadius: 14, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.background = "oklch(98% 0.04 75)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "white"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "oklch(96% 0.04 75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={18} color="var(--gold)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{opt.label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>{opt.sub}</p>
                      </div>
                      <ChevronRight size={16} color="var(--text-light)" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Financeiro</h1>
        <button onClick={() => setExportModal(true)}
          style={{ padding: "10px 20px", borderRadius: 12, border: "1.5px solid var(--gold)", background: "white", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--gold)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}
          onMouseEnter={e => { e.currentTarget.style.background = "oklch(98% 0.04 75)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "white"; }}>
          <BarChart3 size={14} color="var(--gold)" /> Exportar Relatório
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { l: "Receita Bruta", v: loading ? "..." : fmt(monthRevenue), sub: monthLabel, color: "oklch(38% 0.1 145)" },
          { l: "Custos Fixos",  v: loading ? "..." : fmt(totalFixed),   sub: "Despesas mensais", color: "oklch(50% 0.1 20)" },
          { l: "Resultado",     v: loading ? "..." : fmt(resultado),     sub: "Lucro do mês", color: resultado >= 0 ? "oklch(38% 0.1 145)" : "oklch(50% 0.1 20)" },
        ].map((k, i) => (
          <div key={i} style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 8 }}>{k.l}</p>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: k.color }}>{k.v}</p>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Costs table */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Custos Fixos Mensais</h3>
          <button onClick={() => setAdding(v => !v)} style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} color="white" /> Novo Custo
          </button>
        </div>

        {adding && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "oklch(98% 0.03 75)", border: "1.5px solid var(--gold)", marginBottom: 12 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do custo (ex: Água)" style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$</span>
              <input type="number" value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="0,00" style={{ width: 90, padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", textAlign: "right" }} />
            </div>
            <button onClick={addCost} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Adicionar</button>
            <button onClick={() => setAdding(false)} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>✕</button>
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 8 }}>Passe o mouse sobre uma linha para editar ou excluir</p>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 38, borderRadius: 6, background: "var(--border)" }} />)}
          </div>
        ) : (
          <>
            {costs.map(c => <CostRow key={c.id} cost={c} onSave={saveCost} onDelete={deleteCost} />)}
            {costs.length === 0 && <p style={{ textAlign: "center", padding: 20, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 13 }}>Nenhum custo fixo cadastrado.</p>}
          </>
        )}

        <div style={{ paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>Total Mensal</span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-playfair)", color: "oklch(50% 0.1 20)" }}>{loading ? "..." : fmt(totalFixed)}</span>
        </div>
      </div>
    </div>
  );
}
