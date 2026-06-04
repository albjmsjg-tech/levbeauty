"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { signUpClient } from "./actions";

function phoneMask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const split = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

export default function CadastroClientePage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUpClient(formData);
      if (result?.error) setError(result.error);
    });
  }

  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 16, color: "var(--text)", background: "white", outline: "none" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Image src="/logo.png" width={120} height={40} alt="LevBeauty" style={{ margin: "0 auto 14px", display: "block", objectFit: "contain" }} />
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--mauve-dark)" }}>Criar sua conta</h1>
        <p style={{ fontSize: 14, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Veja seu histórico de agendamentos</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px 24px", boxShadow: "0 4px 24px oklch(40% 0.04 340 / 0.08)", border: "1px solid var(--border)" }}>
        <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Seu nome</label>
            <input name="name" placeholder="Fernanda Silva" required style={field} />
          </div>
          <div>
            <label style={label}>Telefone / WhatsApp</label>
            <input
              name="phone"
              value={phone}
              onChange={e => setPhone(phoneMask(e.target.value))}
              placeholder="(11) 99999-0000"
              type="tel"
              inputMode="numeric"
              required
              style={field}
            />
          </div>
          <div>
            <label style={label}>E-mail</label>
            <input type="email" name="email" placeholder="seu@email.com" required style={field} />
          </div>
          <div>
            <label style={label}>Senha</label>
            <input type="password" name="password" placeholder="Mínimo 6 caracteres" minLength={6} required style={field} />
          </div>

          <button type="submit" disabled={pending} style={{ padding: "14px", borderRadius: 12, border: "none", background: pending ? "var(--border)" : "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: pending ? "none" : "0 4px 14px rgba(184,154,143,0.25)", cursor: pending ? "not-allowed" : "pointer" }}>
            {pending ? "Criando conta..." : "Criar conta grátis"}
          </button>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
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
