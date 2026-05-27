"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const premium = {
  name: "PREMIUM",
  price: 79.9,
  tagline: "Tudo que você precisa para gerir seu salão",
  features: [
    "Valor fixo mensal, sem % por agendamento",
    "Agendamentos ilimitados",
    "Link dedicado de agendamento",
    "Dashboard completo",
    "Atendimento a domicílio",
  ],
};

export default function AssinaturaPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", padding: "48px 24px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 28 }}>
            <Image src="/logo.png" width={120} height={40} alt="LevBeauty" style={{ objectFit: "contain" }} />
          </Link>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 42, fontWeight: 700, color: "var(--mauve-dark)", margin: "0 0 14px" }}>Planos e Preços</h1>
          <p style={{ fontSize: 16, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", margin: 0 }}>
            30 dias grátis. Cancele quando quiser.
          </p>
        </div>

        {/* Card Premium */}
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "32px 28px",
          border: "2px solid var(--gold)",
          position: "relative",
          boxShadow: "0 8px 40px rgba(184,154,143,0.12)",
        }}>
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

          {/* Name & price */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)", letterSpacing: "0.1em", margin: "0 0 6px" }}>{premium.name}</p>
            <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "0 0 14px" }}>{premium.tagline}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", fontWeight: 500 }}>R$</span>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: 48, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                {premium.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>/mês</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "6px 0 0" }}>30 dias grátis, sem cartão agora</p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", marginBottom: 22 }} />

          {/* Features */}
          <div style={{ marginBottom: 28 }}>
            {premium.features.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)", lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push("/cadastro")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: "var(--gold)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--font-poppins)",
              boxShadow: "0 4px 16px rgba(184,154,143,0.25)",
              cursor: "pointer",
            }}>
            Começar grátis
          </button>
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
