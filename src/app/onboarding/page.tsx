"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const steps = ["Salão", "Serviços", "Plano"];

const SVC_DEFAULTS: Record<string, { emoji: string; duration_min: number; price: number }> = {
  "Alongamento em Gel": { emoji: "💅", duration_min: 150, price: 180 },
  "Banho de Gel":       { emoji: "✨", duration_min: 90,  price: 120 },
  "Esmaltação em Gel":  { emoji: "💄", duration_min: 60,  price: 90  },
  "Manutenção":         { emoji: "🔧", duration_min: 75,  price: 80  },
  "Nail Art":           { emoji: "🎨", duration_min: 90,  price: 150 },
  "Spa dos Pés":        { emoji: "🦶", duration_min: 60,  price: 90  },
  "Depilação":          { emoji: "🌸", duration_min: 45,  price: 60  },
  "Sobrancelha":        { emoji: "👁️", duration_min: 30, price: 45  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [salon, setSalon] = useState({ name: "", phone: "", address: "", cep: "" });
  const [services, setServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSlug, setSavedSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const svcOptions = Object.keys(SVC_DEFAULTS);
  const toggle = (s: string) => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleFinish = async () => {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Sessão expirada. Faça login novamente.");

      const baseSlug = generateSlug(salon.name) || `salao-${user.id.slice(0, 8)}`;
      let slugToUse = baseSlug;
      let salonRow: { id: string; slug: string } | null = null;

      // Retry with random suffix if slug collides
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error: salonErr } = await supabase
          .from("salons")
          .insert({
            owner_id: user.id,
            name: salon.name.trim(),
            phone: salon.phone.trim() || null,
            address: salon.address.trim() || null,
            cep_base: salon.cep.trim() || null,
            slug: slugToUse,
          })
          .select("id, slug")
          .single();

        if (!salonErr) { salonRow = data; break; }
        if (salonErr.code === "23505") {
          slugToUse = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        } else {
          console.error("Salon insert error:", salonErr);
          throw new Error(`Erro ao criar salão: ${salonErr.message}`);
        }
      }
      if (!salonRow) throw new Error("Não foi possível criar o salão (slug conflict).");
      setSavedSlug(salonRow.slug ?? slugToUse);

      // Create selected services
      if (services.length > 0) {
        const rows = services.map(name => ({
          salon_id: salonRow!.id,
          name,
          ...SVC_DEFAULTS[name],
          active: true,
        }));
        const { error: svcErr } = await supabase.from("services").insert(rows);
        if (svcErr) {
          console.error("Services insert error:", svcErr);
          throw new Error(`Erro ao criar serviços: ${svcErr.message}`);
        }
      }

      // Create trialing subscription — non-fatal, no RLS INSERT policy needed
      const { error: subErr } = await supabase.from("subscriptions").insert({
        owner_id: user.id,
        plan: "pro",
        status: "trialing",
      });
      if (subErr) console.warn("Subscription insert skipped:", subErr.message);

      setSaved(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string }).message;
      console.error("Onboarding handleFinish error:", e);
      setError(msg ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/s/${savedSlug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", background: "white", outline: "none" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>💅</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Configurar seu salão</h1>
          <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Apenas 3 passos para começar</p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 3, borderRadius: 2, background: i <= step ? "var(--gold)" : "var(--border)", transition: "background 0.3s", marginBottom: 6 }} />
              <p style={{ fontSize: 11, color: i === step ? "var(--gold)" : "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: i === step ? 600 : 400, textAlign: "center" }}>{s}</p>
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>

          {/* Step 0: Salon info */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Informações do salão</h2>
              {[
                { label: "Nome do salão *", key: "name", placeholder: "Ex: Studio Bella" },
                { label: "Telefone / WhatsApp", key: "phone", placeholder: "(11) 99999-0000" },
                { label: "Endereço", key: "address", placeholder: "Rua das Flores, 123, São Paulo" },
                { label: "CEP", key: "cep", placeholder: "00000-000" },
              ].map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input value={salon[f.key as keyof typeof salon]} onChange={e => setSalon(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={field} />
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Services */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Quais serviços você oferece?</h2>
              <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 18 }}>Selecione todos que se aplicam</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {svcOptions.map(s => {
                  const sel = services.includes(s);
                  return (
                    <button key={s} onClick={() => toggle(s)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "oklch(97% 0.04 75)" : "white", textAlign: "left", transition: "all 0.15s", cursor: "pointer" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {sel && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--font-poppins)", fontWeight: sel ? 600 : 400 }}>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Plan / Finish */}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Quase lá!</h2>
              <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 20, lineHeight: 1.6 }}>
                Vamos criar seu salão <strong style={{ color: "var(--text)" }}>{salon.name}</strong> com {services.length} serviço{services.length !== 1 ? "s" : ""} e 14 dias grátis.
              </p>

              {saved ? (
                <div>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, oklch(88% 0.055 10), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 18px oklch(72% 0.115 75 / 0.3)" }}>
                    <span style={{ color: "white", fontSize: 28 }}>✓</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>Salão criado!</h3>
                  <p style={{ fontSize: 14, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6, marginBottom: 20 }}>
                    <strong>{salon.name}</strong> está no ar. Compartilhe o link com suas clientes:
                  </p>

                  {/* Public link */}
                  <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 12, padding: "14px 16px", border: "1px solid oklch(90% 0.04 75)", marginBottom: 24, textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginBottom: 8, letterSpacing: "0.04em", margin: "0 0 8px" }}>SEU LINK PÚBLICO</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <code style={{ flex: 1, fontSize: 12, color: "var(--gold)", background: "white", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.4 }}>
                        {typeof window !== "undefined" ? `${window.location.origin}/s/${savedSlug}` : `/s/${savedSlug}`}
                      </code>
                      <button onClick={copyLink} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? "oklch(65% 0.15 145)" : "white", color: copied ? "white" : "var(--text)", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                        {copied ? "✓ Copiado!" : "Copiar"}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "8px 0 0", lineHeight: 1.5 }}>
                      Suas clientes podem agendar diretamente por este link, sem criar conta.
                    </p>
                  </div>

                  <button onClick={() => router.push("/painel/dashboard")} style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", cursor: "pointer" }}>
                    Ir para o painel →
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div style={{ background: "oklch(96% 0.04 15)", border: "1px solid oklch(85% 0.08 15)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "oklch(40% 0.12 15)", fontFamily: "var(--font-poppins)", textAlign: "left" }}>
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleFinish}
                    disabled={saving}
                    style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: saving ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: saving ? "none" : "0 4px 14px oklch(72% 0.115 75 / 0.35)", marginBottom: 12, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Criando salão..." : "Iniciar período gratuito →"}
                  </button>
                  <button onClick={() => router.push("/assinatura")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", color: "var(--text-mid)", fontSize: 14, fontFamily: "var(--font-poppins)", cursor: "pointer" }}>
                    Ver planos e preços
                  </button>
                </>
              )}
            </div>
          )}

          {/* Navigation */}
          {!saved && step < 2 && (
            <div style={{ display: "flex", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", fontSize: 14, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", cursor: "pointer" }}>
                  ← Voltar
                </button>
              )}
              <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !salon.name.trim()} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: step === 0 && !salon.name.trim() ? "var(--border)" : "var(--gold)", color: "white", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins)", cursor: step === 0 && !salon.name.trim() ? "not-allowed" : "pointer" }}>
                Próximo →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
