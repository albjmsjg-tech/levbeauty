"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const REDIRECT_URL = "https://levbeauty.vercel.app/recuperar-senha";

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

function RecuperarSenhaInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  type Mode = "request" | "loading" | "reset" | "done";
  const [mode, setMode] = useState<Mode>("request");

  // Request form
  const [email, setEmail] = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [reqError, setReqError] = useState("");

  // Reset form
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    setMode("loading");
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setReqError("Link inválido ou expirado. Solicite um novo link abaixo.");
        setMode("request");
      } else {
        setMode("reset");
      }
    });
  }, [searchParams]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqLoading(true);
    setReqError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_URL,
      });
      if (error) {
        setReqError("Não foi possível enviar o e-mail. Verifique o endereço informado.");
      } else {
        setSent(true);
      }
    } catch {
      setReqError("Erro ao conectar. Tente novamente.");
    } finally {
      setReqLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (password.length < 6) { setResetError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirm) { setResetError("As senhas não coincidem."); return; }
    setResetLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setResetError("Não foi possível atualizar a senha. O link pode ter expirado.");
      } else {
        setMode("done");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setResetError("Erro ao conectar. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  if (mode === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)" }}>Verificando link...</p>
      </div>
    );
  }

  if (mode === "done") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(92% 0.06 145)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: "oklch(38% 0.12 145)" }}>✓</div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>Senha atualizada!</h2>
        <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)" }}>Redirecionando para o login...</p>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={label}>Nova senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={field} />
        </div>
        <div>
          <label style={label}>Confirmar senha</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required style={field} />
        </div>
        {resetError && (
          <div style={{ padding: "10px 14px", borderRadius: 9, background: "oklch(96% 0.03 15)", border: "1px solid oklch(88% 0.06 15)" }}>
            <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{resetError}</p>
          </div>
        )}
        <button type="submit" disabled={resetLoading} style={{ padding: "14px", borderRadius: 12, border: "none", background: resetLoading ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: resetLoading ? "none" : "0 4px 14px rgba(184,154,143,0.25)", transition: "all 0.2s", cursor: resetLoading ? "not-allowed" : "pointer" }}>
          {resetLoading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    );
  }

  // mode === "request"
  return sent ? (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(92% 0.06 145)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>✓</div>
      <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>E-mail enviado!</h2>
      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", lineHeight: 1.6 }}>
        Verifique sua caixa de entrada e clique no link para redefinir sua senha.
      </p>
    </div>
  ) : (
    <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={label}>E-mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required style={field} />
      </div>
      {reqError && (
        <div style={{ padding: "10px 14px", borderRadius: 9, background: "oklch(96% 0.03 15)", border: "1px solid oklch(88% 0.06 15)" }}>
          <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{reqError}</p>
        </div>
      )}
      <button type="submit" disabled={reqLoading} style={{ padding: "14px", borderRadius: 12, border: "none", background: reqLoading ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: reqLoading ? "none" : "0 4px 14px rgba(184,154,143,0.25)", transition: "all 0.2s", cursor: reqLoading ? "not-allowed" : "pointer" }}>
        {reqLoading ? "Enviando..." : "Enviar link de recuperação"}
      </button>
    </form>
  );
}

export default function RecuperarSenhaPage() {
  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#B89A8F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>🔑</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Recuperar senha</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Enviaremos um link para redefinir sua senha</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        <Suspense fallback={<p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", textAlign: "center" }}>Carregando...</p>}>
          <RecuperarSenhaInner />
        </Suspense>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <Link href="/login" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-poppins)" }}>
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
