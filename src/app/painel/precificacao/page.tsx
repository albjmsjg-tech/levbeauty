"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ServiceModal } from "@/components/owner/ServiceModal";
import type { Service, Input, PricingConfig } from "@/types";
import { DEFAULT_PRICING_CONFIG } from "@/types";
import { fmt, pct, calcRealProfit, computeUnitCost } from "@/lib/utils";
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

  // Card 1: editable price
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);

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

  // Sync price input when selected service changes
  useEffect(() => {
    if (selected) {
      setPriceInput(selected.price.toFixed(2));
      setPriceSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

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

  const handleSavePrice = async () => {
    if (!selected || typeof selected.id !== "string") return;
    const price = parseFloat(priceInput.replace(",", "."));
    if (isNaN(price) || price < 0) return;
    setSavingPrice(true);
    const { error } = await updateServicePrice(selected.id, price);
    if (error) {
      setOpError(error);
    } else {
      setServices(prev => prev.map(s => s.id === selected.id ? { ...s, price } : s));
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 2000);
    }
    setSavingPrice(false);
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

  // Compute breakdown for selected service
  const inputCost = selected
    ? selected.inputs.reduce((acc, id) => {
        const inp = inputs.find(i => i.id === id);
        return acc + (inp ? computeUnitCost(inp) : 0);
      }, 0)
    : 0;

  const calc = selected
    ? calcRealProfit({
        price: selected.price,
        inputCost,
        taxPct: pricingConfig.taxPct,
        cardPct: pricingConfig.cardPct,
        fixedPct: pricingConfig.fixedCostPct,
      })
    : null;

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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-5">
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Precificação</h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>
            Entenda onde vai cada real do que você cobra
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 14px rgba(184,154,143,0.25)", flexShrink: 0 }}>
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
          {/* Service pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
            {services.map(svc => {
              const sel = svc.id === selected?.id;
              return (
                <button key={String(svc.id)} onClick={() => setSelectedId(svc.id)}
                  style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "white", color: sel ? "white" : "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: sel ? 600 : 400, fontFamily: "var(--font-poppins)", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", boxShadow: sel ? "0 3px 10px rgba(184,154,143,0.2)" : "none" }}>
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

          {selected && calc && (
            <div className="flex flex-col gap-4">

              <div className="flex flex-col lg:flex-row gap-4">

              {/* ── Card 1: Preço cobrado ── */}
              <div className="w-full" style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
                <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>PREÇO COBRADO</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flex: 1 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "var(--text-light)", fontFamily: "var(--font-poppins)", lineHeight: 1 }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceInput}
                    onChange={e => { setPriceInput(e.target.value); setPriceSaved(false); }}
                    style={{ flex: 1, fontFamily: "var(--font-playfair)", fontSize: 48, fontWeight: 600, color: "var(--text)", border: "none", borderBottom: "2px solid var(--border)", outline: "none", background: "transparent", minWidth: 0 }}
                  />
                </div>
                <button
                  onClick={handleSavePrice}
                  disabled={savingPrice}
                  style={{ padding: "12px", borderRadius: 10, border: "none", background: priceSaved ? "oklch(55% 0.15 145)" : savingPrice ? "var(--border)" : "var(--gold)", color: "white", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)", cursor: savingPrice ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
                  {priceSaved ? "✓ Salvo!" : savingPrice ? "Salvando…" : "Salvar Preço"}
                </button>
              </div>

              {/* ── Card 2: Onde vai cada real ── */}
              <div className="w-full" style={{ background: "white", borderRadius: 16, padding: "22px 24px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>ONDE VAI CADA REAL</p>

                {/* Price row */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)", fontWeight: 600 }}>Preço cobrado</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{fmt(selected.price)}</span>
                </div>

                {/* Deduction rows */}
                {[
                  { label: "Custo insumos",                              value: calc.inputCost },
                  { label: `Impostos (${pct(pricingConfig.taxPct)})`,    value: calc.tax },
                  { label: `Taxa cartão (${pct(pricingConfig.cardPct)})`, value: calc.card },
                  { label: `Custo fixo (${pct(pricingConfig.fixedCostPct)})`, value: calc.fixed },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>− {row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "oklch(52% 0.08 15)", fontFamily: "var(--font-poppins)" }}>{fmt(row.value)}</span>
                  </div>
                ))}

                {/* Net profit */}
                <div style={{ borderTop: "2px solid var(--text)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>LUCRO LÍQUIDO</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: calc.netProfit >= 0 ? "oklch(43% 0.16 145)" : "oklch(48% 0.16 15)", fontFamily: "var(--font-playfair)", display: "block" }}>
                      {fmt(calc.netProfit)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>
                      {calc.profitPct.toFixed(1)}% do preço
                    </span>
                  </div>
                </div>
              </div>

              </div>{/* end flex-row cards 1+2 */}

              {/* ── Card 3: Insumos ── */}
              <div className="w-full" style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", fontWeight: 600 }}>INSUMOS DESTE SERVIÇO</p>
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
                      <span style={{ fontSize: 14, fontWeight: 700, color: "oklch(55% 0.08 10)", fontFamily: "var(--font-poppins)" }}>{fmt(inputCost)}</span>
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
