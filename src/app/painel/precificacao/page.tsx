"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ServiceModal } from "@/components/owner/ServiceModal";
import type { Service, Input, PricingConfig } from "@/types";
import { DEFAULT_PRICING_CONFIG } from "@/types";
import { fmt, pct, calcPricing, calcRealProfit, computeUnitCost } from "@/lib/utils";
import { getPrecificacaoData, upsertService, removeService, updateServicePrice } from "./actions";

export default function PrecificacaoPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [modal, setModal] = useState<Service | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [applyingPrice, setApplyingPrice] = useState(false);

  useEffect(() => {
    getPrecificacaoData().then(({ services, inputs, salonId, pricingConfig, error }) => {
      if (error) setFetchError(error);
      setServices(services);
      setInputs(inputs);
      setSalonId(salonId);
      setPricingConfig(pricingConfig);
      setSelectedId(services[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  const selected = services.find(s => s.id === selectedId) ?? services[0] ?? null;

  const saveService = async (draft: Service) => {
    if (!salonId) return;
    setOpError(null);
    setModal(null);

    const isNew = typeof draft.id === "number";
    setServices(prev => isNew ? [...prev, draft] : prev.map(s => s.id === draft.id ? draft : s));
    if (isNew) setSelectedId(draft.id);

    const { id, error } = await upsertService(draft, salonId);
    if (error) {
      setOpError(error);
      if (isNew) {
        setServices(prev => prev.filter(s => s.id !== draft.id));
        setSelectedId(services[0]?.id ?? null);
      }
      return;
    }

    if (isNew) {
      setServices(prev => prev.map(s => s.id === draft.id ? { ...s, id } : s));
      setSelectedId(id);
    }
  };

  const deleteService = async (id: string | number) => {
    if (typeof id !== "string") return;
    const remaining = services.filter(s => s.id !== id);
    setServices(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
    const { error } = await removeService(id);
    if (error) setOpError(error);
  };

  const handleApplyIdealPrice = async () => {
    if (!selected || typeof selected.id !== "string") return;
    setApplyingPrice(true);
    const { idealPrice } = calcPricing(selected, inputs, pricingConfig);
    const rounded = Math.round(idealPrice * 100) / 100;
    const { error } = await updateServicePrice(selected.id, rounded);
    if (error) {
      setOpError(error);
    } else {
      setServices(prev => prev.map(s => s.id === selected.id ? { ...s, price: rounded } : s));
    }
    setApplyingPrice(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14 }}>
      Carregando serviços…
    </div>
  );

  if (fetchError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", flexDirection: "column", gap: 6 }}>
      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: "oklch(50% 0.12 15)" }}>Erro ao carregar</p>
      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)" }}>{fetchError}</p>
    </div>
  );

  const calc = selected ? calcPricing(selected, inputs, pricingConfig) : null;
  const { selectedInpCost = 0, idealPrice = 0, manicureCost = 0 } = calc ?? {};
  const realProfit = selected ? calcRealProfit(selected.price, selectedInpCost, pricingConfig, selected.manicurePct) : 0;
  const realMarginPct = selected && selected.price > 0 ? (realProfit / selected.price) * 100 : 0;
  const priceDiff = selected ? idealPrice - selected.price : 0;
  const priceIsLow = priceDiff > 0.5;
  const priceIsHigh = priceDiff < -0.5;

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

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Módulo de Precificação</h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>Calcule o preço ideal e compare com o valor atual cobrado</p>
        </div>
        <button onClick={() => setModal("new")}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", flexShrink: 0 }}>
          <Plus size={15} color="white" /> Novo Serviço
        </button>
      </div>

      {opError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "oklch(94% 0.04 15)", border: "1px solid oklch(88% 0.08 15)", fontSize: 12, color: "oklch(42% 0.12 15)", fontFamily: "var(--font-poppins)" }}>
          {opError}
        </div>
      )}

      {services.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14 }}>
          Nenhum serviço cadastrado. Clique em &quot;Novo Serviço&quot; para começar.
        </div>
      ) : (
        <>
          {/* Service pills + edit/delete */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
            {services.map(svc => {
              const sel = svc.id === selected?.id;
              return (
                <button key={String(svc.id)} onClick={() => setSelectedId(svc.id)}
                  style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "white", color: sel ? "white" : "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: "var(--font-poppins)", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", boxShadow: sel ? "0 3px 10px oklch(72% 0.115 75 / 0.3)" : "none" }}>
                  <span style={{ fontSize: 15 }}>{svc.emoji || "💅"}</span>
                  {svc.name}
                </button>
              );
            })}
            {selected && (
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button onClick={() => setModal(selected)}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid var(--gold)", background: "oklch(98% 0.04 75)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                  ✏️ Editar
                </button>
                <button onClick={() => deleteService(selected.id)}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid oklch(90% 0.04 15)", background: "oklch(98% 0.02 15)", cursor: "pointer", fontSize: 12, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)" }}>
                  🗑️
                </button>
              </div>
            )}
          </div>

          {selected && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Card 1: Preço Ideal */}
              <div style={{ background: "linear-gradient(145deg, oklch(36% 0.06 340), oklch(28% 0.05 320))", borderRadius: 16, padding: "22px 24px", color: "white", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "oklch(72% 0.115 75 / 0.15)" }} />
                <div style={{ position: "absolute", bottom: -30, left: -10, width: 120, height: 120, borderRadius: "50%", background: "oklch(88% 0.055 10 / 0.08)" }} />

                <p style={{ fontSize: 10, color: "oklch(75% 0.04 340)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", fontWeight: 600, position: "relative" }}>PREÇO IDEAL CALCULADO</p>
                <p style={{ fontFamily: "var(--font-playfair)", fontSize: 46, fontWeight: 600, color: "white", lineHeight: 1.1, margin: "6px 0 4px", position: "relative" }}>{fmt(idealPrice)}</p>
                <p style={{ fontSize: 12, color: "oklch(75% 0.04 340)", fontFamily: "var(--font-poppins)", marginBottom: 16, position: "relative" }}>
                  com {pct(pricingConfig.profitMargin)} de margem · {selected.inputs.length} insumos
                </p>

                {/* Composition */}
                <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { label: "Custo dos insumos", val: selectedInpCost },
                    { label: `Impostos (${pct(pricingConfig.taxPct)})`, val: idealPrice * pricingConfig.taxPct / 100 },
                    { label: `Cartão (${pct(pricingConfig.cardPct)})`, val: idealPrice * pricingConfig.cardPct / 100 },
                    { label: `Custos fixos (${pct(pricingConfig.fixedCostPct)})`, val: idealPrice * pricingConfig.fixedCostPct / 100 },
                    ...(selected.manicurePct > 0 ? [{ label: `Manicure (${pct(selected.manicurePct)})`, val: manicureCost }] : []),
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "oklch(78% 0.03 340)", fontFamily: "var(--font-poppins)" }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "oklch(90% 0.04 340)", fontFamily: "var(--font-poppins)" }}>{fmt(row.val)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid oklch(60% 0.04 340)", paddingTop: 7, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "oklch(88% 0.06 145)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>Lucro líquido</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "oklch(88% 0.12 145)", fontFamily: "var(--font-poppins)" }}>
                      {fmt(idealPrice - selectedInpCost - idealPrice * (pricingConfig.taxPct + pricingConfig.cardPct + pricingConfig.fixedCostPct) / 100 - manicureCost)}
                    </span>
                  </div>
                </div>

                {/* Apply button */}
                {(priceIsLow || priceIsHigh) && (
                  <button onClick={handleApplyIdealPrice} disabled={applyingPrice}
                    style={{ position: "relative", marginTop: 16, width: "100%", padding: "10px", borderRadius: 10, border: "1px solid oklch(72% 0.115 75 / 0.6)", background: "oklch(72% 0.115 75 / 0.2)", color: "white", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-poppins)", cursor: applyingPrice ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
                    {applyingPrice ? "Aplicando…" : `Aplicar ${fmt(idealPrice)} como preço atual`}
                  </button>
                )}
              </div>

              {/* Card 2: Lucro Real */}
              <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
                <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", fontWeight: 600 }}>PREÇO ATUAL COBRADO</p>
                <p style={{ fontFamily: "var(--font-playfair)", fontSize: 46, fontWeight: 600, color: "var(--text)", lineHeight: 1.1, margin: "6px 0 4px" }}>{fmt(selected.price)}</p>

                {/* Delta badge */}
                {priceIsLow && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "oklch(96% 0.04 15)", border: "1px solid oklch(90% 0.08 15)", marginBottom: 14, alignSelf: "flex-start" }}>
                    <span style={{ fontSize: 11, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>
                      ↓ {fmt(Math.abs(priceDiff))} abaixo do ideal
                    </span>
                  </div>
                )}
                {priceIsHigh && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "oklch(94% 0.05 145)", border: "1px solid oklch(88% 0.08 145)", marginBottom: 14, alignSelf: "flex-start" }}>
                    <span style={{ fontSize: 11, color: "oklch(38% 0.1 145)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>
                      ↑ {fmt(Math.abs(priceDiff))} acima do ideal
                    </span>
                  </div>
                )}
                {!priceIsLow && !priceIsHigh && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8, background: "oklch(94% 0.05 145)", border: "1px solid oklch(88% 0.08 145)", marginBottom: 14, alignSelf: "flex-start" }}>
                    <span style={{ fontSize: 11, color: "oklch(38% 0.1 145)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>✓ Alinhado com o ideal</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {[
                    { label: "Custo dos insumos", val: selectedInpCost, color: "oklch(55% 0.08 15)" },
                    { label: "Deduções (imp + cartão + fixo)", val: selected.price * (pricingConfig.taxPct + pricingConfig.cardPct + pricingConfig.fixedCostPct) / 100, color: "oklch(55% 0.08 250)" },
                    ...(selected.manicurePct > 0 ? [{ label: `Comissão manicure (${pct(selected.manicurePct)})`, val: selected.price * selected.manicurePct / 100, color: "oklch(55% 0.08 320)" }] : []),
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color, fontFamily: "var(--font-poppins)" }}>−{fmt(row.val)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>Lucro real</span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: realProfit >= 0 ? "oklch(45% 0.12 145)" : "oklch(50% 0.12 15)", fontFamily: "var(--font-playfair)", display: "block" }}>{fmt(realProfit)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>{realMarginPct.toFixed(1)}% sobre o preço</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Parâmetros */}
              <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>Parâmetros de Precificação</p>
                  <Link href="/painel/configuracoes" style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600, textDecoration: "none" }}>
                    Alterar →
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Margem de lucro", val: pricingConfig.profitMargin },
                    { label: "Impostos", val: pricingConfig.taxPct },
                    { label: "Taxa do cartão", val: pricingConfig.cardPct },
                    { label: "Custos fixos", val: pricingConfig.fixedCostPct },
                    ...(selected.manicurePct > 0 ? [{ label: "Comissão manicure (neste serviço)", val: selected.manicurePct }] : []),
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{row.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 60, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(row.val, 50) * 2}%`, height: "100%", background: "var(--gold)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)", minWidth: 38, textAlign: "right" }}>{pct(row.val)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, padding: "8px 12px", borderRadius: 8, background: "oklch(97% 0.03 75)", border: "1px solid oklch(92% 0.04 75)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                      Total deduções: <strong style={{ color: "var(--gold)" }}>
                        {pct(pricingConfig.profitMargin + pricingConfig.taxPct + pricingConfig.cardPct + pricingConfig.fixedCostPct + selected.manicurePct)}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Insumos */}
              <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>Insumos deste Serviço</p>
                  <Link href="/painel/insumos" style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600, textDecoration: "none" }}>
                    Gerenciar →
                  </Link>
                </div>

                {selected.inputs.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>
                    Nenhum insumo vinculado. Edite o serviço para adicionar.
                  </p>
                ) : (
                  <>
                    {selected.inputs.map(id => {
                      const inp = inputs.find(i => i.id === id);
                      if (!inp) return null;
                      const cost = computeUnitCost(inp);
                      return (
                        <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                          <div>
                            <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block" }}>{inp.name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>
                              {inp.perApplication}{inp.unit} por aplicação · R$ {(inp.pkgCost / inp.pkgQty).toFixed(2)}/{inp.unit}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(cost)}</span>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>Total insumos</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "oklch(55% 0.08 10)", fontFamily: "var(--font-poppins)" }}>{fmt(selectedInpCost)}</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
