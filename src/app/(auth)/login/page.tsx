"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", background: "white", outline: "none" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Image src="/logo.png" width={96} height={96} alt="LevBeauty" style={{ margin: "0 auto 14px", display: "block" }} />
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 600, color: "var(--mauve-dark)" }}>Bem-vinda de volta</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Entre na sua conta LevBeauty</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>E-mail</label>
            <input type="email" name="email" placeholder="seu@email.com" required style={field} />
          </div>
          <div>
            <label style={label}>Senha</label>
            <input type="password" name="password" placeholder="••••••••" required style={field} />
          </div>

          <div style={{ textAlign: "right", marginTop: -8 }}>
            <Link href="/recuperar-senha" style={{ fontSize: 12, color: "var(--gold)", fontWeight: 500, textDecoration: "none", fontFamily: "var(--font-poppins)" }}>
              Esqueci minha senha
            </Link>
          </div>

          <button type="submit" disabled={pending} style={{ padding: "14px", borderRadius: 12, border: "none", background: pending ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: pending ? "none" : "0 4px 14px rgba(184,154,143,0.25)", transition: "all 0.2s", cursor: pending ? "not-allowed" : "pointer" }}>
            {pending ? "Entrando..." : "Entrar"}
          </button>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </form>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
            Não tem conta?{" "}
            <Link href="/cadastro" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>Cadastre-se</Link>
          </p>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: "center", display: "flex", gap: 16, justifyContent: "center", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-light)", textDecoration: "none", fontFamily: "var(--font-poppins)" }}>← Voltar ao início</Link>
        <span style={{ fontSize: 13, color: "var(--border)", fontFamily: "var(--font-poppins)" }}>·</span>
        <Link href="/privacidade" style={{ fontSize: 13, color: "var(--text-light)", textDecoration: "none", fontFamily: "var(--font-poppins)" }}>Privacidade</Link>
      </div>
    </div>
  );
}
