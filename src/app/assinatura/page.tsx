"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    id: "pro", name: "PRO", price: 49, recommended: false,
    features: ["Até 50 agendamentos/mês", "App da cliente", "Dashboard básico", "Agenda online", "1 profissional"],
  },
  {
    id: "premium", name: "PREMIUM", price: 99.9, recommended: true,
    features: ["Agendamentos ilimitados", "App da cliente", "Dashboard completo", "Módulo de precificação", "Gestão de insumos", "Relatório financeiro CSV", "Até 3 profissionais"],
  },
  {
    id: "elite", name: "ELITE", price: 149.9, recommended: false,
    features: ["Tudo do PREMIUM", "Multi-salão", "Profissionais ilimitados", "Atendimento a domicílio", "Exportação de relatórios", "Suporte prioritário", "Customização da marca"],
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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💅</div>
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "var(--mauve-dark)" }}>LevBeauty</span>
          </Link>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 44, fontWeight: 700, color: "var(--mauve-dark)", marginBottom: 14 }}>Planos e Preços</h1>
          <p style={{ fontSize: 18, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginBottom: 8 }}>
            14 dias grátis em qualquer plano. Cancele quando quiser.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ background: "white", borderRadius: 20, padding: 28, border: `2px solid ${plan.recommended ? "var(--gold)" : "var(--border)"}`, position: "relative", boxShadow: plan.recommended ? "0 8px 32px oklch(72% 0.115 75 / 0.2)" : "0 2px 12px oklch(40% 0.04 340 / 0.06)" }}>
              {plan.recommended && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", padding: "4px 18px", borderRadius: 20, background: "var(--gold)", fontSize: 11, fontWeight: 700, color: "white", fontFamily: "var(--font-poppins)", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                  ✨ MAIS POPULAR
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: plan.recommended ? "var(--gold)" : "var(--text-light)", fontFamily: "var(--font-poppins)", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: 44, fontWeight: 700, color: "var(--text)" }}>
                    R${plan.price.toLocaleString("pt-BR", { minimumFractionDigits: plan.price % 1 !== 0 ? 2 : 0 })}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>/mês</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>14 dias grátis, sem cartão agora</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "oklch(95% 0.04 75)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700 }}>✓</span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => handleSubscribe(plan.id)} disabled={loading === plan.id}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: plan.recommended ? "none" : "1.5px solid var(--gold)", background: plan.recommended ? "var(--gold)" : "white", color: plan.recommended ? "white" : "var(--gold)", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: plan.recommended ? "0 4px 14px oklch(72% 0.115 75 / 0.35)" : "none", transition: "all 0.2s", opacity: loading === plan.id ? 0.7 : 1 }}>
                {loading === plan.id ? "Carregando…" : "Assinar agora"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>
          Dúvidas? <a href="mailto:suporte@levbeauty.com.br" style={{ color: "var(--gold)", textDecoration: "none" }}>suporte@levbeauty.com.br</a>
        </p>
      </div>
    </div>
  );
}
