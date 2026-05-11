"use client";

import { useState, useEffect } from "react";
import { Clock, Copy, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCEP } from "@/lib/utils";

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

  // WhatsApp / Z-API state
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiConnected, setZapiConnected] = useState(false);
  const [zapiSaving, setZapiSaving] = useState(false);
  const [zapiStatus, setZapiStatus] = useState<"idle" | "ok" | "fail">("idle");

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
        .select("id, name, phone, address, slug, home_enabled, home_salon, requires_deposit, cep_base, max_radius_km, price_per_km, min_travel_fee, zapi_instance_id, zapi_token, zapi_connected")
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
        setZapiInstanceId((salon.zapi_instance_id as string) ?? "");
        setZapiToken((salon.zapi_token as string) ?? "");
        setZapiConnected((salon.zapi_connected as boolean) ?? false);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSaveWhatsApp = async () => {
    if (!salonId) return;
    setZapiSaving(true);
    setZapiStatus("idle");

    const supabase = createClient();

    await supabase
      .from("salons")
      .update({
        zapi_instance_id: zapiInstanceId.trim() || null,
        zapi_token: zapiToken.trim() || null,
        zapi_connected: false,
      })
      .eq("id", salonId);

    if (!zapiInstanceId.trim() || !zapiToken.trim()) {
      setZapiConnected(false);
      setZapiStatus("fail");
      setZapiSaving(false);
      return;
    }

    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: zapiInstanceId.trim(), token: zapiToken.trim() }),
    });
    const data = await res.json() as { connected: boolean };

    await supabase
      .from("salons")
      .update({ zapi_connected: data.connected })
      .eq("id", salonId);

    setZapiConnected(data.connected);
    setZapiStatus(data.connected ? "ok" : "fail");
    setZapiSaving(false);
  };

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
              O pagamento do sinal é processado via <strong>Stripe</strong>. Certifique-se de que a variável <code style={{ background: "oklch(93% 0.02 75)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace" }}>STRIPE_SECRET_KEY</code> está configurada no seu projeto Vercel.
            </p>
          </div>
        )}
      </div>

      {/* ── WhatsApp / Z-API ─────────────────────── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>WhatsApp (Z-API)</h3>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>Envie notificações automáticas para clientes</p>
          </div>
          {zapiConnected ? (
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "oklch(38% 0.12 145)", background: "oklch(94% 0.06 145)", border: "1px solid oklch(80% 0.1 145)", borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>✅ Conectado</span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "oklch(48% 0.12 15)", background: "oklch(96% 0.04 15)", border: "1px solid oklch(85% 0.08 15)", borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>❌ Desconectado</span>
          )}
        </div>

        <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 10, padding: "10px 14px", border: "1px solid oklch(90% 0.04 75)", marginBottom: 18, marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", margin: 0, lineHeight: 1.6 }}>
            Acesse <strong>app.z-api.io</strong>, crie uma instância, copie o <strong>ID</strong> e o <strong>Token</strong> e cole abaixo para conectar seu WhatsApp.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>ID da Instância</label>
            <input
              value={zapiInstanceId}
              onChange={e => { setZapiInstanceId(e.target.value); setZapiStatus("idle"); }}
              placeholder="Ex: 3AB12CD34EF..."
              style={field}
            />
          </div>
          <div>
            <label style={lbl}>Token</label>
            <input
              value={zapiToken}
              onChange={e => { setZapiToken(e.target.value); setZapiStatus("idle"); }}
              placeholder="Ex: F4E3D2C1B0A9..."
              style={field}
            />
          </div>
        </div>

        {zapiStatus === "ok" && (
          <div style={{ marginTop: 14, background: "oklch(94% 0.06 145)", border: "1px solid oklch(80% 0.1 145)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ fontSize: 13, color: "oklch(32% 0.1 145)", fontFamily: "var(--font-poppins)", fontWeight: 600, margin: 0 }}>✅ WhatsApp conectado com sucesso!</p>
          </div>
        )}
        {zapiStatus === "fail" && (
          <div style={{ marginTop: 14, background: "oklch(96% 0.04 15)", border: "1px solid oklch(85% 0.08 15)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ fontSize: 13, color: "oklch(40% 0.12 15)", fontFamily: "var(--font-poppins)", fontWeight: 600, margin: 0 }}>❌ Não foi possível conectar. Verifique o ID e Token.</p>
          </div>
        )}

        <button
          onClick={handleSaveWhatsApp}
          disabled={zapiSaving}
          style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 12, border: "none", background: zapiSaving ? "var(--border)" : "oklch(28% 0.055 340)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: zapiSaving ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
          {zapiSaving ? "Conectando..." : "Salvar e conectar"}
        </button>
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
