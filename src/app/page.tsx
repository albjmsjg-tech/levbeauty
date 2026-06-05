"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" width={120} height={40} alt="LevBeauty" style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" style={{ padding: "9px 22px", borderRadius: 10, border: "1.5px solid var(--border)", background: "white", textDecoration: "none", fontSize: 14, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>Entrar</Link>
          <Link href="/cadastro" style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "var(--gold)", textDecoration: "none", fontSize: 14, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px rgba(184,154,143,0.25)" }}>Começar grátis</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: "oklch(95% 0.04 75)", border: "1px solid oklch(88% 0.06 75)", marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)", letterSpacing: "0.05em" }}>Gerencie seu negócio de onde estiver</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 56, fontWeight: 700, color: "var(--mauve-dark)", lineHeight: 1.1, marginBottom: 20 }}>
            O único App para profissionais
            <span style={{ color: "var(--gold)", display: "block", fontStyle: "italic" }}>da beleza que atendem a domicílio</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.7, marginBottom: 36, maxWidth: 540, margin: "0 auto 36px" }}>
            Agendamento online, precificação inteligente, gestão de insumos e financeiro completo — tudo em um só lugar.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/cadastro" style={{ padding: "16px 32px", borderRadius: 14, background: "#B89A8F", textDecoration: "none", fontSize: 16, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 6px 24px rgba(184,154,143,0.3)" }}>
              Criar conta grátis →
            </Link>
            <Link href="/assinatura" style={{ padding: "16px 32px", borderRadius: 14, border: "1.5px solid var(--border)", background: "white", textDecoration: "none", fontSize: 16, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>
              Ver planos
            </Link>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 48 }}>
            {["Agendamento online", "App da cliente", "Precificação inteligente", "Relatório financeiro", "Atendimento a domicílio"].map(f => (
              <span key={f} style={{ padding: "7px 16px", borderRadius: 20, background: "white", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", fontWeight: 500 }}>
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      </main>

      <div style={{ padding: "20px 40px", borderTop: "1px solid var(--border)", background: "white", display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>Acesso rápido:</span>
        <Link href="/app" style={{ fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-poppins)", textDecoration: "none", fontWeight: 600 }}>App da Cliente →</Link>
        <Link href="/painel/dashboard" style={{ fontSize: 12, color: "var(--mauve)", fontFamily: "var(--font-poppins)", textDecoration: "none", fontWeight: 600 }}>Painel da Gestora →</Link>
        <Link href="/onboarding" style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", textDecoration: "none" }}>Onboarding →</Link>
        <span style={{ fontSize: 12, color: "var(--border)", fontFamily: "var(--font-poppins)" }}>·</span>
        <Link href="/privacidade" style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", textDecoration: "none" }}>Política de Privacidade</Link>
      </div>
    </div>
  );
}
