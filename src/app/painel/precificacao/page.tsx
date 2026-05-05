"use client";

import { useState } from "react";
import { Plus, Info } from "lucide-react";
import { ServiceModal } from "@/components/owner/ServiceModal";
import type { Service } from "@/types";
import { defaultServices, defaultInputs } from "@/lib/data";
import { fmt, pct, calcPricing, computeUnitCost } from "@/lib/utils";

export default function PrecificacaoPage() {
  const [catalog, setCatalog] = useState<Service[]>(defaultServices);
  const [inputs] = useState(defaultInputs);
  const [selectedId, setSelectedId] = useState<number | string>(1);
  const [modal, setModal] = useState<Service | "new" | null>(null);

  const selected = catalog.find(s => s.id === selectedId) || catalog[0];
  const { selectedInpCost, idealPrice, grossProfit, netProfit, manicureCost } = calcPricing(selected, inputs);

  const saveService = (draft: Service) => {
    setCatalog(prev => {
      const exists = prev.find(s => s.id === draft.id);
      return exists ? prev.map(s => s.id === draft.id ? draft : s) : [...prev, draft];
    });
    setSelectedId(draft.id);
    setModal(null);
  };

  const deleteService = (id: number | string) => {
    setCatalog(prev => prev.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(catalog[0]?.id);
  };

  const breakdownRows = [
    { label: "Custo dos Insumos", val: selectedInpCost, color: "oklch(55% 0.08 10)", pctVal: selectedInpCost / idealPrice * 100 },
    { label: `Impostos (${pct(selected.taxPct)})`, val: idealPrice * selected.taxPct / 100, color: "oklch(60% 0.1 250)", pctVal: selected.taxPct },
    { label: `Taxa Cartão (${pct(selected.cardPct)})`, val: idealPrice * selected.cardPct / 100, color: "oklch(60% 0.1 320)", pctVal: selected.cardPct },
    { label: `Custo Fixo (${pct(selected.mktPct)})`, val: idealPrice * selected.mktPct / 100, color: "oklch(60% 0.1 145)", pctVal: selected.mktPct },
    ...(selected.manicurePct > 0 ? [{ label: `Comissão Manicure (${pct(selected.manicurePct)})`, val: manicureCost, color: "oklch(60% 0.1 320)", pctVal: selected.manicurePct }] : []),
    { label: `Lucro Líquido (${pct(selected.profitMargin)})`, val: netProfit, color: "oklch(72% 0.115 75)", pctVal: selected.profitMargin },
  ];

  return (
    <div style={{ padding: "28px 32px", minHeight: "100%" }}>
      {modal !== null && (
        <ServiceModal
          svc={modal === "new" ? null : modal}
          allInputs={inputs}
          onSave={saveService}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Módulo de Precificação</h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>Cadastre serviços e calcule o preço ideal com custos reais</p>
        </div>
        <button onClick={() => setModal("new")}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", flexShrink: 0 }}>
          <Plus size={15} color="white" /> Novo Serviço
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        {/* Service list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.05em", marginBottom: 4 }}>SERVIÇOS CADASTRADOS</p>
          {catalog.map(svc => {
            const { idealPrice: ip } = calcPricing(svc, inputs);
            const sel = svc.id === selectedId;
            return (
              <div key={svc.id} onClick={() => setSelectedId(svc.id)}
                style={{ background: "white", borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, cursor: "pointer", boxShadow: sel ? "0 4px 16px oklch(72% 0.115 75 / 0.15)" : "0 1px 4px oklch(40% 0.04 340 / 0.05)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: sel ? "linear-gradient(135deg, oklch(88% 0.055 10), oklch(82% 0.065 350))" : "oklch(97% 0.015 75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "background 0.15s" }}>
                  {svc.emoji || "💅"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{svc.name}</p>
                  <p style={{ fontSize: 11, color: sel ? "var(--gold)" : "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: sel ? 700 : 400, marginTop: 2 }}>{fmt(ip)}</p>
                </div>
                {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {/* Calculator */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Service header */}
          <div style={{ background: "white", borderRadius: 16, padding: "16px 20px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(82% 0.065 350))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {selected.emoji || "💅"}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)" }}>{selected.name}</h2>
              <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>
                {selected.inputs.length} insumos · margem {selected.profitMargin}%{selected.manicurePct > 0 && ` · manicure ${selected.manicurePct}%`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal(selected)} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>✏️ Editar</button>
              <button onClick={() => deleteService(selected.id)} style={{ padding: "8px 12px", borderRadius: 9, border: "1.5px solid oklch(90% 0.04 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", fontSize: 12, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)" }}>🗑️</button>
            </div>
          </div>

          {/* Price result */}
          <div style={{ background: "linear-gradient(145deg, oklch(36% 0.06 340), oklch(28% 0.05 320))", borderRadius: 16, padding: "22px 24px", color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "oklch(72% 0.115 75 / 0.15)" }} />
            <div style={{ position: "absolute", bottom: -30, left: -10, width: 120, height: 120, borderRadius: "50%", background: "oklch(88% 0.055 10 / 0.08)" }} />
            <p style={{ fontSize: 11, color: "oklch(80% 0.04 340)", fontFamily: "var(--font-poppins)", letterSpacing: "0.07em", fontWeight: 500, position: "relative" }}>PREÇO IDEAL SUGERIDO</p>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: 50, fontWeight: 600, color: "white", lineHeight: 1.1, margin: "6px 0 14px", position: "relative" }}>{fmt(idealPrice)}</p>
            <div style={{ display: "flex", gap: 12, position: "relative", flexWrap: "wrap" }}>
              {[
                { l: "Custo Insumos", v: fmt(selectedInpCost), c: "oklch(80% 0.04 340)" },
                { l: "Lucro Bruto", v: fmt(grossProfit), c: "oklch(80% 0.04 340)" },
                { l: "Lucro Líquido", v: fmt(netProfit), c: "oklch(85% 0.12 140)" },
                ...(selected.manicurePct > 0 ? [{ l: `Manicure (${selected.manicurePct}%)`, v: fmt(manicureCost), c: "oklch(80% 0.08 320)" }] : []),
              ].map((it, i) => (
                <div key={i} style={{ flex: "1 1 120px", background: "oklch(100% 0 0 / 0.1)", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, color: "oklch(75% 0.04 340)", fontFamily: "var(--font-poppins)" }}>{it.l}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-playfair)", color: it.c, marginTop: 2 }}>{it.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>Composição do Preço</h3>
            {breakdownRows.map((r, i) => (
              <div key={i} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{r.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>{r.pctVal.toFixed(1)}%</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", minWidth: 65, textAlign: "right" }}>{fmt(r.val)}</span>
                  </div>
                </div>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(r.pctVal, 100)}%`, height: "100%", background: r.color, borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>Preço de Venda Sugerido</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-playfair)" }}>{fmt(idealPrice)}</span>
            </div>
          </div>

          {/* Insumos detail */}
          {selected.inputs.length > 0 && (
            <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Insumos deste Serviço</h3>
              {selected.inputs.map(idx => {
                const inp = inputs[idx];
                if (!inp) return null;
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{inp.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(computeUnitCost(inp))}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>Total insumos</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "oklch(55% 0.08 10)", fontFamily: "var(--font-poppins)" }}>{fmt(selectedInpCost)}</span>
              </div>
            </div>
          )}

          {selected.manicurePct > 0 && (
            <div style={{ background: "oklch(96% 0.03 320)", borderRadius: 12, padding: "12px 16px", border: "1px solid oklch(88% 0.06 320)", display: "flex", gap: 10 }}>
              <Info size={15} color="oklch(55% 0.1 320)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "oklch(35% 0.06 320)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>
                Com manicure terceirizada a <strong>{selected.manicurePct}%</strong>, você repassa <strong>{fmt(manicureCost)}</strong> por atendimento. Seu lucro líquido real é <strong>{fmt(netProfit)}</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
