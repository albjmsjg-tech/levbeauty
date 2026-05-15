"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CadastroClientePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) { setError(error.message); return; }
      router.refresh();
      window.location.href = "/app";
    } catch {
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", background: "white", outline: "none" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>💅</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Criar sua conta</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Veja seu histórico de agendamentos</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        <form onSubmit={handleCadastro} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Seu nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Fernanda Silva" required style={field} />
          </div>
          <div>
            <label style={label}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required style={field} />
          </div>
          <div>
            <label style={label}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required style={field} />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "oklch(96% 0.03 15)", border: "1px solid oklch(88% 0.06 15)" }}>
              <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ padding: "14px", borderRadius: 12, border: "none", background: loading ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: loading ? "none" : "0 4px 14px oklch(72% 0.115 75 / 0.35)", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Criando conta…" : "Criar conta grátis"}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
            Já tem conta?{" "}
            <Link href="/login" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
