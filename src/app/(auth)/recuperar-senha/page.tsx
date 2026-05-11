"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/nova-senha`,
      });
      if (error) {
        setError("Não foi possível enviar o e-mail. Verifique o endereço informado.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const field: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    fontFamily: "var(--font-poppins)",
    fontSize: 14,
    color: "var(--text)",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-poppins)",
    display: "block",
    marginBottom: 6,
  };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>🔑</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Recuperar senha</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Enviaremos um link para redefinir sua senha</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(92% 0.06 145)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>✓</div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>E-mail enviado!</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", lineHeight: 1.6 }}>
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={label}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={field}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 9, background: "oklch(96% 0.03 15)", border: "1px solid oklch(88% 0.06 15)" }}>
                <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: loading ? "var(--border)" : "var(--gold)",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-poppins)",
                boxShadow: loading ? "none" : "0 4px 14px oklch(72% 0.115 75 / 0.35)",
                transition: "all 0.2s",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <Link href="/login" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-poppins)" }}>
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
