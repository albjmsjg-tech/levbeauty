"use client";

import { useState } from "react";
import Link from "next/link";
import { saveAnamnese, type AnamneseInput } from "@/app/painel/clientes/actions";

interface ClientAnamnese {
  id: string;
  allergies: string | null;
  has_diabetes: boolean;
  is_pregnant: boolean;
  uses_continuous_medication: boolean;
  other_conditions: string | null;
  preferences: string | null;
  technical_history: string | null;
  general_notes: string | null;
  lgpd_consent_at: string | null;
}

interface Props {
  client: ClientAnamnese;
  onClose?: () => void;
}

export function FichaAnamnese({ client, onClose }: Props) {
  const [allergies, setAllergies] = useState(client.allergies ?? "");
  const [hasDiabetes, setHasDiabetes] = useState(client.has_diabetes);
  const [isPregnant, setIsPregnant] = useState(client.is_pregnant);
  const [usesMedication, setUsesMedication] = useState(client.uses_continuous_medication);
  const [otherConditions, setOtherConditions] = useState(client.other_conditions ?? "");
  const [preferences, setPreferences] = useState(client.preferences ?? "");
  const [technicalHistory, setTechnicalHistory] = useState(client.technical_history ?? "");
  const [generalNotes, setGeneralNotes] = useState(client.general_notes ?? "");
  const [lgpdChecked, setLgpdChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isFirstConsent = !client.lgpd_consent_at;

  const ta: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)",
    fontSize: 13, color: "var(--text)", resize: "vertical", outline: "none",
    boxSizing: "border-box", lineHeight: 1.6,
  };

  const handleSave = async () => {
    if (isFirstConsent && !lgpdChecked) {
      setErr("Confirme o consentimento LGPD antes de salvar.");
      return;
    }
    setSaving(true);
    setErr(null);
    const data: AnamneseInput = {
      allergies: allergies || null,
      hasDiabetes,
      isPregnant,
      usesContinuousMedication: usesMedication,
      otherConditions: otherConditions || null,
      preferences: preferences || null,
      technicalHistory: technicalHistory || null,
      generalNotes: generalNotes || null,
    };
    const result = await saveAnamnese(client.id, data, isFirstConsent && lgpdChecked);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (onClose) onClose();
    } else {
      setErr(result.error ?? "Erro ao salvar.");
    }
  };

  return (
    <div>
      {/* Alergias */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>
          Alergias
        </label>
        <textarea
          value={allergies}
          onChange={e => setAllergies(e.target.value)}
          rows={3}
          placeholder="Anote alergias importantes para o atendimento desta cliente..."
          style={ta}
        />
      </div>

      {/* Condições especiais */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10 }}>
          Condições especiais
        </label>
        {([
          { key: "diabetes", label: "Diabetes", value: hasDiabetes, set: setHasDiabetes },
          { key: "pregnant", label: "Gestante", value: isPregnant, set: setIsPregnant },
          { key: "medication", label: "Uso de medicamentos contínuo", value: usesMedication, set: setUsesMedication },
        ] as const).map(item => (
          <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={item.value}
              onChange={e => item.set(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" }}
            />
            <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
          </label>
        ))}
        <label style={{ display: "block", fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginBottom: 6, marginTop: 4 }}>
          Outras condições:
        </label>
        <textarea
          value={otherConditions}
          onChange={e => setOtherConditions(e.target.value)}
          rows={2}
          placeholder="Outras informações de saúde relevantes..."
          style={ta}
        />
      </div>

      {/* Preferências */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>
          Preferências de atendimento
        </label>
        <textarea
          value={preferences}
          onChange={e => setPreferences(e.target.value)}
          rows={3}
          placeholder="O que esta cliente gosta ou não gosta? (horários, materiais, estilo, conforto...)"
          style={ta}
        />
      </div>

      {/* Histórico técnico */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>
          Histórico técnico
        </label>
        <textarea
          value={technicalHistory}
          onChange={e => setTechnicalHistory(e.target.value)}
          rows={3}
          placeholder="Procedimentos anteriores, reações, tempo médio de duração, frequência ideal..."
          style={ta}
        />
      </div>

      {/* Observações gerais */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>
          Observações gerais
        </label>
        <textarea
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          rows={3}
          placeholder="Notas internas sobre esta cliente..."
          style={ta}
        />
      </div>

      {/* LGPD */}
      {isFirstConsent && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 20 }}>
          <div style={{ background: "#F6F2EC", borderRadius: 10, padding: "14px 16px", border: "1px solid #C9C4BC", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)", marginBottom: 8, letterSpacing: "0.05em" }}>
              ⚖️ LGPD — Consentimento necessário
            </p>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={lgpdChecked}
                onChange={e => setLgpdChecked(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, cursor: "pointer", accentColor: "var(--gold)", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>
                Confirmo que tenho consentimento desta cliente para registrar estas informações conforme a LGPD (Lei 13.709/2018).{" "}
                <Link href="/privacidade" target="_blank" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
                  Ver política completa →
                </Link>
              </span>
            </label>
          </div>
        </div>
      )}

      {!isFirstConsent && (
        <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 16 }}>
          ✓ Consentimento registrado em {new Date(client.lgpd_consent_at!).toLocaleDateString("pt-BR")}
        </p>
      )}

      {err && (
        <p style={{ fontSize: 12, color: "oklch(48% 0.14 15)", fontFamily: "var(--font-poppins)", marginBottom: 12, padding: "8px 12px", background: "oklch(97% 0.03 15)", borderRadius: 8, border: "1px solid oklch(88% 0.05 15)" }}>
          {err}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || (isFirstConsent && !lgpdChecked)}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: (isFirstConsent && !lgpdChecked) ? "var(--border)" : "var(--gold)",
            cursor: (isFirstConsent && !lgpdChecked) ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 700, color: "white",
            fontFamily: "var(--font-poppins)",
            boxShadow: (isFirstConsent && !lgpdChecked) ? "none" : "0 4px 14px rgba(184,154,143,0.2)",
          }}>
          {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar anamnese"}
        </button>
      </div>
    </div>
  );
}
