"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import type { SalonConfig } from "@/types";
import { defaultSalonConfig } from "@/lib/data";
import { formatCEP } from "@/lib/utils";

export default function ConfiguracoesPage() {
  const [cfg, setCfg] = useState<SalonConfig>({ ...defaultSalonConfig });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof SalonConfig, v: string | number | boolean) => setCfg(c => ({ ...c, [k]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", background: "white", outline: "none" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6 };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 600 }}>
      <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Configurações</h1>
      <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 24 }}>Gerencie as informações e regras do seu salão</p>

      {/* Salon info */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Informações do Salão</h3>
        {[
          { label: "Nome do Salão", key: "name" as const },
          { label: "Telefone / WhatsApp", key: "phone" as const },
          { label: "Endereço completo", key: "address" as const },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{f.label}</label>
            <input value={cfg[f.key] as string} onChange={e => set(f.key, e.target.value)} style={fieldStyle} />
          </div>
        ))}
      </div>

      {/* Home visit */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Atendimento a Domicílio</h3>
            <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 2 }}>Configure as regras para atendimentos fora do salão</p>
          </div>
          <button onClick={() => set("homeEnabled", !cfg.homeEnabled)}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", background: cfg.homeEnabled ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: cfg.homeEnabled ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px oklch(22% 0.04 340 / 0.2)" }} />
          </button>
        </div>

        {cfg.homeEnabled && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>CEP do Salão (referência para calcular distância)</label>
              <input value={cfg.cepBase} onChange={e => set("cepBase", formatCEP(e.target.value))} placeholder="00000-000" maxLength={9} style={fieldStyle} />
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>O CEP da cliente será comparado a este para calcular a distância aproximada</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={labelStyle}>Raio máximo</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{cfg.maxRadiusKm} km</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={cfg.maxRadiusKm} onChange={e => set("maxRadiusKm", Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>1 km</span>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>50 km</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={labelStyle}>Valor por km (ida + volta)</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>R$ {cfg.pricePerKm.toFixed(2)}/km</span>
                </div>
                <input type="range" min={0.5} max={10} step={0.25} value={cfg.pricePerKm} onChange={e => set("pricePerKm", Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$ 0,50</span>
                  <span style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>R$ 10,00</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={labelStyle}>Taxa mínima de deslocamento</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>R$ {cfg.minTravelFee.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={cfg.minTravelFee} onChange={e => set("minTravelFee", Number(e.target.value))} style={{ width: "100%" }} />
            </div>

            {/* Preview */}
            <div style={{ background: "oklch(97% 0.04 75)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(88% 0.06 75)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 6 }}>Exemplo de cálculo:</p>
              {[5, 10, 15].map(km => {
                const fee = Math.max(cfg.minTravelFee, km * 2 * cfg.pricePerKm);
                const inRange = km <= cfg.maxRadiusKm;
                return (
                  <div key={km} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{km} km de distância</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-poppins)", color: inRange ? "var(--gold)" : "oklch(55% 0.1 15)" }}>
                      {inRange ? `R$ ${fee.toFixed(2)}` : "Fora do raio"}
                    </span>
                  </div>
                );
              })}
              <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 6 }}>Taxa = máx(mínimo, distância × 2 × R$/km) — ida e volta inclusos</p>
            </div>

            <div style={{ background: "oklch(96% 0.03 340)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(90% 0.03 340)", display: "flex", gap: 10 }}>
              <Clock size={15} color="var(--text-mid)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.6 }}>
                <strong>Bloqueio automático:</strong> após um agendamento a domicílio confirmado, 2 horas são bloqueadas na agenda antes do próximo horário disponível para cobrir o deslocamento.
              </p>
            </div>
          </div>
        )}
      </div>

      <button onClick={save}
        style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: saved ? "oklch(55% 0.1 145)" : "var(--gold)", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: "white", transition: "background 0.3s", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.3)" }}>
        {saved ? "✓ Configurações salvas!" : "Salvar Configurações"}
      </button>
    </div>
  );
}
