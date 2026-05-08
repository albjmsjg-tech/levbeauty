"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    id: "premium",
    name: "PREMIUM",
    price: 79.9,
    recommended: false,
    tagline: "Para quem está começando",
    features: [
      "Valor fixo mensal, sem % por agendamento",
      "Agendamentos ilimitados",
      "Link dedicado de agendamento",
      "Dashboard completo",
      "Atendimento a domicílio",
    ],
  },
  {
    id: "elite",
    name: "ELITE",
    price: 149.9,
    recommended: true,
    tagline: "Para quem quer crescer",
    features: [
      "Tudo do PREMIUM",
      "Módulo de precificação",
      "Gestão de insumos",
      "Exportação de relatórios",
      "Suporte prioritário",
    ],
  },
];

export default function AssinaturaPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Erro ao criar assinatura. Configure suas chaves Stripe.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💅</div>
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--mauve-dark)" }}>LevBeauty</span>
          </Link>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 42, fontWeight: 700, color: "var(--mauve-dark)", margin: "0 0 14px" }}>Planos e Preços</h1>
          <p style={{ fontSize: 16, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", margin: 0 }}>
            14 dias grátis em qualquer plano. Cancele quando quiser.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: "white",
              borderRadius: 20,
              padding: "32px 28px",
              border: `2px solid ${plan.recommended ? "var(--gold)" : "var(--border)"}`,
              position: "relative",
              boxShadow: plan.recommended
                ? "0 8px 40px oklch(72% 0.115 75 / 0.18)"
                : "0 2px 12px oklch(40% 0.04 340 / 0.06)",
            }}>
              {plan.recommended && (
                <div style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "5px 20px",
                  borderRadius: 20,
                  background: "var(--gold)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: "var(--font-poppins)",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}>
                  ✨ MAIS POPULAR
                </div>
              )}

              {/* Plan name & price */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: plan.recommended ? "var(--gold)" : "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.1em", margin: "0 0 6px" }}>{plan.name}</p>
                <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "0 0 14px" }}>{plan.tagline}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", fontWeight: 500 }}>R$</span>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: 48, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                    {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>/mês</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "6px 0 0" }}>14 dias grátis, sem cartão agora</p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", marginBottom: 22 }} />

              {/* Features */}
              <div style={{ marginBottom: 28 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: plan.recommended ? "var(--gold)" : "oklch(95% 0.04 75)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 10, color: plan.recommended ? "white" : "var(--gold)", fontWeight: 700 }}>✓</span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: plan.recommended ? "none" : "1.5px solid var(--gold)",
                  background: plan.recommended ? "var(--gold)" : "white",
                  color: plan.recommended ? "white" : "var(--gold)",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-poppins)",
                  boxShadow: plan.recommended ? "0 4px 16px oklch(72% 0.115 75 / 0.35)" : "none",
                  cursor: loading === plan.id ? "not-allowed" : "pointer",
                  opacity: loading === plan.id ? 0.7 : 1,
                  transition: "all 0.2s",
                }}>
                {loading === plan.id ? "Carregando…" : "Começar grátis"}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: 36, fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>
          Dúvidas?{" "}
          <a href="mailto:suporte@levbeauty.com.br" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>
            suporte@levbeauty.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
