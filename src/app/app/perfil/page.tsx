"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

function phoneMask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const split = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

function cepMask(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid #E0DAD4",
  fontFamily: "var(--font-poppins)",
  fontSize: 16,
  color: "#0A0A0A",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
  minHeight: 48,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#6B6560",
  fontFamily: "var(--font-poppins)",
  display: "block",
  marginBottom: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-light)",
  fontFamily: "var(--font-poppins)",
  marginBottom: 14,
};

export default function ClientPerfilPage() {
  const router = useRouter();

  const [email, setEmail]           = useState("");
  const [name, setName]             = useState("");
  const [phone, setPhone]           = useState("");
  const [cep, setCep]               = useState("");
  const [street, setStreet]         = useState("");
  const [number, setNumber]         = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity]             = useState("");
  const [uf, setUf]                 = useState("");

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? "");

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, cep, address_street, address_number, address_complement, address_neighborhood, address_city, address_state")
        .eq("id", user.id)
        .single();

      if (p) {
        setName((p.full_name as string | null) ?? "");
        const rawPhone = (p.phone as string | null) ?? "";
        setPhone(rawPhone ? phoneMask(rawPhone) : "");
        const rawCep = (p.cep as string | null) ?? "";
        setCep(rawCep ? cepMask(rawCep) : "");
        setStreet((p.address_street as string | null) ?? "");
        setNumber((p.address_number as string | null) ?? "");
        setComplement((p.address_complement as string | null) ?? "");
        setNeighborhood((p.address_neighborhood as string | null) ?? "");
        setCity((p.address_city as string | null) ?? "");
        setUf((p.address_state as string | null) ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const fetchCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json() as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!data.erro) {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setUf(data.uf);
      }
    } catch {
      // ViaCEP indisponível — campos ficam como estão
    }
    setCepLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:             name.trim() || null,
        phone:                 phone.replace(/\D/g, "") || null,
        cep:                   cep.replace(/\D/g, "") || null,
        address_street:        street.trim() || null,
        address_number:        number.trim() || null,
        address_complement:    complement.trim() || null,
        address_neighborhood:  neighborhood.trim() || null,
        address_city:          city.trim() || null,
        address_state:         uf.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setSaveError("Não foi possível salvar. Tente novamente.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ padding: "28px 20px 100px" }}>
        <div style={{ height: 110, borderRadius: 16, background: "var(--border)", marginBottom: 24 }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 10, background: "var(--border)", marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Toast de confirmação */}
      {saved && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, background: "#0A0A0A", color: "white",
          fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600,
          padding: "12px 20px", borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          ✓ Dados atualizados com sucesso
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#B89A8F", padding: "28px 20px 36px", textAlign: "center" }}>
        <div style={{
          width: 68, height: 68, borderRadius: "50%",
          background: "rgba(255,255,255,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", fontSize: 28,
        }}>
          👩
        </div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 600, color: "#0A0A0A", margin: 0 }}>
          {name || "Meu Perfil"}
        </h2>
      </div>

      <div style={{ padding: "24px 20px" }}>

        {/* ── Dados pessoais ─────────────────────────── */}
        <p style={sectionLabelStyle}>Dados pessoais</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
          <div>
            <label style={labelStyle}>Nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome completo"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Telefone / WhatsApp</label>
            <input
              value={phone}
              onChange={e => setPhone(phoneMask(e.target.value))}
              placeholder="(11) 99999-0000"
              type="tel"
              inputMode="numeric"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: "#F6F2EC", border: "1.5px solid #E0DAD4", minHeight: 48,
              display: "flex", alignItems: "center",
            }}>
              <p style={{ fontSize: 15, color: "#6B6560", fontFamily: "var(--font-poppins)", margin: 0 }}>
                {email}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 5, lineHeight: 1.5 }}>
              Para alterar seu e-mail, fale com o salão.
            </p>
          </div>
        </div>

        {/* ── Endereço ───────────────────────────────── */}
        <p style={sectionLabelStyle}>Endereço</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
          <div>
            <label style={labelStyle}>
              CEP{cepLoading && <span style={{ fontWeight: 400, color: "var(--text-light)", marginLeft: 8 }}>buscando...</span>}
            </label>
            <input
              value={cep}
              onChange={e => setCep(cepMask(e.target.value))}
              onBlur={() => fetchCep(cep)}
              placeholder="00000-000"
              maxLength={9}
              inputMode="numeric"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Rua / Logradouro</label>
            <input
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="Rua das Flores"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Número</label>
              <input
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="123"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Complemento</label>
              <input
                value={complement}
                onChange={e => setComplement(e.target.value)}
                placeholder="Apto 4B"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Bairro</label>
            <input
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              placeholder="Centro"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="São Paulo"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input
                value={uf}
                onChange={e => setUf(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Erro ao salvar */}
        {saveError && (
          <div style={{ background: "oklch(96% 0.04 15)", border: "1px solid oklch(88% 0.08 15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{saveError}</p>
          </div>
        )}

        {/* Botão salvar */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: saving ? "#D9D3CD" : "#B89A8F",
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "var(--font-poppins)",
            cursor: saving ? "not-allowed" : "pointer",
            minHeight: 52,
            boxShadow: saving ? "none" : "0 4px 14px rgba(184,154,143,0.3)",
            transition: "background 0.2s",
          }}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>

        {/* Logout */}
        <div
          onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", cursor: "pointer", marginTop: 24, borderTop: "1px solid var(--border)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "oklch(95% 0.04 15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={16} color="oklch(55% 0.12 15)" />
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: "oklch(55% 0.12 15)", margin: 0 }}>
            Sair da conta
          </p>
        </div>

      </div>
    </div>
  );
}
