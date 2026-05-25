"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError("Não foi possível atualizar a senha. O link pode ter expirado.");
      } else {
        setDone(true);
        setTimeout(() => router.push("/painel/dashboard"), 2000);
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
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#B89A8F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>🔒</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Nova senha</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Digite e confirme sua nova senha</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(92% 0.06 145)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: "oklch(38% 0.12 145)" }}>✓</div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>Senha atualizada!</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)" }}>Redirecionando para o painel...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={label}>Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                style={field}
              />
            </div>
            <div>
              <label style={label}>Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
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
                boxShadow: loading ? "none" : "0 4px 14px rgba(184,154,143,0.25)",
                transition: "all 0.2s",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
