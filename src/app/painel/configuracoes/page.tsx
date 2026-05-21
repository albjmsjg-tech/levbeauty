"use client";

import { useState, useEffect } from "react";
import { Clock, Copy, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCEP } from "@/lib/utils";
import { getPricingConfig, savePricingConfig } from "./actions";
import { HorariosAtendimento } from "@/components/configuracoes/HorariosAtendimento";
import type { PricingConfig } from "@/types";
import { DEFAULT_PRICING_CONFIG } from "@/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeSlug(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export default function ConfiguracoesPage() {
  const router = useRouter();

  // Salon state
  const [salonId, setSalonId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [slug, setSlug] = useState("");

  // Home visit state
  const [homeEnabled, setHomeEnabled] = useState(false);
  const [homeSalon, setHomeSalon] = useState(true);
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [cepBase, setCepBase] = useState("");
  const [maxRadius, setMaxRadius] = useState(10);
  const [pricePerKm, setPricePerKm] = useState(2);
  const [minFee, setMinFee] = useState(20);
  const [slotIntervalMin, setSlotIntervalMin] = useState(30);
  const [homeVisitIntervalMin, setHomeVisitIntervalMin] = useState(120);

  // Pricing config state
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: salon } = await supabase
        .from("salons")
        .select("id, name, phone, address, slug, home_enabled, home_salon, requires_deposit, cep_base, max_radius_km, price_per_km, min_travel_fee, salon_slot_interval_min, home_visit_interval_min")
        .eq("owner_id", user.id)
        .single();

      if (salon) {
        setSalonId(salon.id as string);
        setName((salon.name as string) ?? "");
        setPhone((salon.phone as string) ?? "");
        setAddress((salon.address as string) ?? "");
        setSlug((salon.slug as string) ?? "");
        setHomeEnabled((salon.home_enabled as boolean) ?? false);
        setHomeSalon((salon.home_salon as boolean) ?? true);
        setRequiresDeposit((salon.requires_deposit as boolean) ?? false);
        setCepBase((salon.cep_base as string) ?? "");
        setMaxRadius((salon.max_radius_km as number) ?? 10);
        setPricePerKm((salon.price_per_km as number) ?? 2);
        setMinFee((salon.min_travel_fee as number) ?? 20);
        setSlotIntervalMin((salon.salon_slot_interval_min as number) ?? 30);
        setHomeVisitIntervalMin((salon.home_visit_interval_min as number) ?? 120);

        const pc = await getPricingConfig();
        setPricing(pc);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSlugChange = (v: string) => {
    setSlug(sanitizeSlug(v));
    setSlugError("");
  };

  const handleSave = async () => {
    if (!salonId) return;
    setSaving(true);
    setSaved(false);
    setSlugError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("salons")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        slug: slug || null,
        home_enabled: homeEnabled,
        home_salon: homeSalon,
        requires_deposit: requiresDeposit,
        cep_base: cepBase || null,
        max_radius_km: maxRadius,
        price_per_km: pricePerKm,
        min_travel_fee: minFee,
      })
      .eq("id", salonId);

    if (error) {
      if (error.code === "23505") {
        setSlugError("Este slug já está em uso. Escolha outro.");
      } else {
        setSlugError("Erro ao salvar. Tente novamente.");
      }
      setSaving(false);
      return;
    }

    const { error: pcErr } = await savePricingConfig(salonId, pricing);
    if (pcErr) {
      setSlugError("Erro ao salvar parâmetros de precificação.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const copyLink = () => {
    if (!slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const publicUrl = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${slug}`
    : "";

  const field: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    fontFamily: "var(--font-poppins)",
    fontSize: 13,
    color: "var(--text)",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-poppins)",
    display: "block",
    marginBottom: 6,
  };

  if (loading) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <div style={{ height: 32, width: 200, borderRadius: 8, background: "var(--border)", marginBottom: 24 }} />
        {[1, 2].map(i => (
          <div key={i} style={{ height: 160, borderRadius: 16, background: "var(--border)", marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 620 }}>
      <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Configurações</h1>
      <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 28 }}>Gerencie as informações e regras do seu salão</p>

      {/* ── Salon info ───────────────────────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 18 }}>Informações do Salão</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Nome do Salão</label>
          <input value={name} onChange={e => setName(e.target.value)} style={field} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Telefone / WhatsApp</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-0000" style={field} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Endereço completo</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua das Flores, 123, São Paulo" style={field} />
        </div>

        {/* Slug */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Link público (slug)</label>
            <button
              onClick={() => { setSlug(slugify(name)); setSlugError(""); }}
              style={{ background: "none", border: "none", fontFamily: "var(--font-poppins)", fontSize: 11, fontWeight: 600, color: "var(--gold)", cursor: "pointer", padding: 0 }}>
              Gerar do nome
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", border: `1.5px solid ${slugError ? "oklch(65% 0.15 15)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden", background: "white" }}>
              <span style={{ padding: "10px 10px 10px 14px", fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", whiteSpace: "nowrap", borderRight: "1px solid var(--border)", background: "oklch(97% 0.01 0)" }}>
                /s/
              </span>
              <input
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="meu-salao"
                style={{ flex: 1, padding: "10px 12px", border: "none", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", background: "transparent" }}
              />
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "5px 0 0" }}>
            Apenas letras minúsculas, números e hífens.
          </p>

          {slugError && (
            <p style={{ fontSize: 12, color: "oklch(50% 0.15 15)", fontFamily: "var(--font-poppins)", margin: "6px 0 0", fontWeight: 500 }}>{slugError}</p>
          )}

          {/* URL preview */}
          {slug && (
            <div style={{ marginTop: 10, background: "oklch(97% 0.03 75)", borderRadius: 10, padding: "10px 14px", border: "1px solid oklch(90% 0.04 75)", display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{ flex: 1, fontSize: 12, color: "var(--gold)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {publicUrl}
              </code>
              <button
                onClick={copyLink}
                title="Copiar link"
                style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid oklch(88% 0.06 75)", background: copied ? "oklch(65% 0.15 145)" : "white", color: copied ? "white" : "var(--text-mid)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, transition: "all 0.2s" }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span style={{ fontSize: 11, fontFamily: "var(--font-poppins)", fontWeight: 600 }}>{copied ? "Copiado" : "Copiar"}</span>
              </button>
              <a
                href={`/s/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir link"
                style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid oklch(88% 0.06 75)", background: "white", color: "var(--text-mid)", cursor: "pointer", display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Home visit ───────────────────────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Atendimento a Domicílio</h3>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>Configure as regras para atendimentos fora do salão</p>
          </div>
          <button
            onClick={() => setHomeEnabled(v => !v)}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: homeEnabled ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: homeEnabled ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px oklch(22% 0.04 340 / 0.2)" }} />
          </button>
        </div>

        {homeEnabled && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>CEP do Salão (referência para calcular distância)</label>
              <input
                value={cepBase}
                onChange={e => setCepBase(formatCEP(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
                style={field}
              />
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>
                O CEP da cliente será comparado a este para calcular a distância aproximada
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Raio máximo</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{maxRadius} km</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={maxRadius} onChange={e => setMaxRadius(Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>1 km</span>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>50 km</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Valor por km (ida + volta)</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>R$ {pricePerKm.toFixed(2)}/km</span>
                </div>
                <input type="range" min={0.5} max={10} step={0.25} value={pricePerKm} onChange={e => setPricePerKm(Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$ 0,50</span>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$ 10,00</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Taxa mínima de deslocamento</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>R$ {minFee.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={minFee} onChange={e => setMinFee(Number(e.target.value))} style={{ width: "100%" }} />
            </div>

            {/* Preview */}
            <div style={{ background: "oklch(97% 0.04 75)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(88% 0.06 75)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>Exemplo de cálculo:</p>
              {[5, 10, 15].map(km => {
                const fee = Math.max(minFee, km * 2 * pricePerKm);
                const inRange = km <= maxRadius;
                return (
                  <div key={km} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{km} km de distância</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-poppins)", color: inRange ? "var(--gold)" : "oklch(55% 0.1 15)" }}>
                      {inRange ? `R$ ${fee.toFixed(2)}` : "Fora do raio"}
                    </span>
                  </div>
                );
              })}
              <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>
                Taxa = máx(mínimo, distância × 2 × R$/km) — ida e volta inclusos
              </p>
            </div>

            <div style={{ background: "oklch(96% 0.03 340)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(90% 0.03 340)", display: "flex", gap: 10 }}>
              <Clock size={15} color="var(--text-mid)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>
                <strong>Bloqueio automático:</strong> após um agendamento a domicílio confirmado, 2 horas são bloqueadas na agenda antes do próximo horário disponível para cobrir o deslocamento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modalidades ──────────────────────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Modalidades de Atendimento</h3>
        <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 18 }}>Defina como você atende as clientes</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: "0 0 2px" }}>Atendimento no salão</p>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: 0 }}>Permite que clientes agendem no espaço físico</p>
          </div>
          <button
            onClick={() => setHomeSalon(v => !v)}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: homeSalon ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: homeSalon ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px oklch(22% 0.04 340 / 0.2)" }} />
          </button>
        </div>
      </div>

      {/* ── Horários de atendimento ──────────────────── */}
      {salonId && (
        <HorariosAtendimento salonId={salonId} initialSalonIntervalMin={slotIntervalMin} initialHomeIntervalMin={homeVisitIntervalMin} />
      )}

      {/* ── Sinal de pagamento ───────────────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Cobrar sinal de 20% para agendar</h3>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", lineHeight: 1.6, margin: 0 }}>
              A cliente paga 20% do valor do serviço para confirmar o agendamento. O restante é cobrado no dia do atendimento.
            </p>
          </div>
          <button
            onClick={() => setRequiresDeposit(v => !v)}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: requiresDeposit ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0, marginTop: 4 }}>
            <div style={{ position: "absolute", top: 3, left: requiresDeposit ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px oklch(22% 0.04 340 / 0.2)" }} />
          </button>
        </div>

        {requiresDeposit && (
          <div style={{ marginTop: 14, background: "oklch(97% 0.04 75)", borderRadius: 10, padding: "12px 14px", border: "1px solid oklch(90% 0.04 75)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💳</span>
            <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6, margin: 0 }}>
              O sinal é cobrado pela profissional via <strong>Pix</strong> ou link de pagamento. O sistema avisa a cliente que vai receber a cobrança em breve.
            </p>
          </div>
        )}
      </div>

      {/* ── Parâmetros de Precificação ───────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Parâmetros de Precificação</h3>
        <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 18 }}>
          Estes valores são usados para calcular o preço ideal de todos os serviços
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {(
            [
              { key: "taxPct",        label: "Impostos (Simples / MEI)", min: 0, max: 20, step: 0.5,  suffix: "%" },
              { key: "cardPct",       label: "Taxa do cartão",            min: 0, max: 10, step: 0.1,  suffix: "%" },
              { key: "fixedCostPct",  label: "Custos fixos rateados",     min: 0, max: 30, step: 0.5,  suffix: "%" },
            ] as const
          ).map(({ key, label, min, max, step, suffix }) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>{label}</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>
                  {pricing[key].toFixed(1)}{suffix}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={pricing[key]}
                onChange={e => setPricing(p => ({ ...p, [key]: Number(e.target.value) }))}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>{min}{suffix}</span>
                <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>{max}{suffix}</span>
              </div>
            </div>
          ))}

          <div style={{ background: "oklch(97% 0.04 75)", borderRadius: 10, padding: "10px 14px", border: "1px solid oklch(90% 0.04 75)" }}>
            <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", margin: 0 }}>
              Total deduzido do preço:{" "}
              <strong style={{ color: "var(--gold)" }}>
                {(pricing.taxPct + pricing.cardPct + pricing.fixedCostPct).toFixed(1)}%
              </strong>
              {" "}— o restante ({(100 - pricing.taxPct - pricing.cardPct - pricing.fixedCostPct).toFixed(1)}%) cobre insumos e é seu lucro.
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 12,
          border: "none",
          background: saved ? "oklch(55% 0.1 145)" : saving || !name.trim() ? "var(--border)" : "var(--gold)",
          cursor: saving || !name.trim() ? "not-allowed" : "pointer",
          fontFamily: "var(--font-poppins)",
          fontSize: 14,
          fontWeight: 600,
          color: "white",
          transition: "background 0.3s",
          boxShadow: saved || saving || !name.trim() ? "none" : "0 4px 14px oklch(72% 0.115 75 / 0.3)",
        }}>
        {saved ? "✓ Configurações salvas!" : saving ? "Salvando..." : "Salvar Configurações"}
      </button>
    </div>
  );
}
