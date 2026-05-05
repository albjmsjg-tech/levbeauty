"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = ["Salão", "Serviços", "Plano"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [salon, setSalon] = useState({ name: "", phone: "", address: "", cep: "" });
  const [services, setServices] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const svcOptions = ["Alongamento em Gel", "Banho de Gel", "Esmaltação em Gel", "Manutenção", "Nail Art", "Spa dos Pés", "Depilação", "Sobrancelha"];

  const toggle = (s: string) => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", background: "white", outline: "none" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>💅</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Configurar seu salão</h1>
          <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Apenas 3 passos para começar</p>
        </div>

        {/* Steps */}
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
                    <button key={s} onClick={() => toggle(s)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "oklch(97% 0.04 75)" : "white", textAlign: "left", transition: "all 0.15s" }}>
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

          {/* Step 2: Plan */}
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Escolha seu plano</h2>
              <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 20 }}>Comece com 14 dias grátis em qualquer plano</p>
              {saved ? (
                <div style={{ padding: 32 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, oklch(88% 0.055 10), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 18px oklch(72% 0.115 75 / 0.3)" }}>
                    <span style={{ color: "white", fontSize: 28 }}>✓</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, color: "var(--text)", marginBottom: 8 }}>Salão configurado!</h3>
                  <p style={{ fontSize: 14, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>Seu salão está pronto. Vamos ao painel!</p>
                  <button onClick={() => router.push("/painel/dashboard")} style={{ marginTop: 24, padding: "14px 32px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
                    Ir para o painel →
                  </button>
                </div>
              ) : (
                <button onClick={() => { setSaved(true); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", marginBottom: 12 }}>
                  Iniciar período gratuito →
                </button>
              )}
              {!saved && (
                <button onClick={() => router.push("/assinatura")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", color: "var(--text-mid)", fontSize: 14, fontFamily: "var(--font-poppins)" }}>
                  Ver planos e preços
                </button>
              )}
            </div>
          )}

          {/* Navigation */}
          {!saved && (
            <div style={{ display: "flex", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", fontSize: 14, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                  ← Voltar
                </button>
              )}
              {step < steps.length - 1 && (
                <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !salon.name} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: step === 0 && !salon.name ? "var(--border)" : "var(--gold)", color: "white", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins)" }}>
                  Próximo →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
