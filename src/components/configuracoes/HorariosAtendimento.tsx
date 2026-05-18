"use client";

import { useState, useEffect } from "react";
import {
  getSalonHours,
  saveSalonHours,
  saveSalonInterval,
  getBlockedDates,
  addBlockedDate,
  removeBlockedDate,
} from "@/app/painel/configuracoes/actions";
import type { SalonHour, BlockedDate } from "@/types";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) continue;
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const DEFAULT_HOURS: SalonHour[] = Array.from({ length: 7 }, (_, i) => ({
  id: "",
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5,
  opensAt: i >= 1 && i <= 5 ? "09:00" : i === 6 ? "09:00" : null,
  closesAt: i >= 1 && i <= 5 ? "18:00" : i === 6 ? "14:00" : null,
}));

interface Props {
  salonId: string;
  initialIntervalMin: number;
}

function formatBlockedDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${days[date.getDay()]}, ${d} de ${months[m - 1]} de ${y}`;
}

export function HorariosAtendimento({ salonId, initialIntervalMin }: Props) {
  const [hours, setHours] = useState<SalonHour[]>(DEFAULT_HOURS);
  const [intervalMin, setIntervalMin] = useState(initialIntervalMin);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [fetched, dates] = await Promise.all([
        getSalonHours(salonId),
        getBlockedDates(salonId),
      ]);
      if (fetched.length > 0) {
        // Merge with defaults to ensure all 7 days are present
        const merged = DEFAULT_HOURS.map(dh => fetched.find(fh => fh.dayOfWeek === dh.dayOfWeek) ?? dh);
        setHours(merged);
      }
      setBlockedDates(dates);
    }
    load();
  }, [salonId]);

  const updateHour = (dayOfWeek: number, field: keyof SalonHour, value: unknown) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    const [hoursRes, intervalRes] = await Promise.all([
      saveSalonHours(salonId, hours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        isOpen: h.isOpen,
        opensAt: h.opensAt,
        closesAt: h.closesAt,
      }))),
      saveSalonInterval(salonId, intervalMin),
    ]);
    if (hoursRes.error ?? intervalRes.error) {
      setSaveError(hoursRes.error ?? intervalRes.error ?? "Erro ao salvar.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const openModal = () => {
    setNewDate("");
    setNewReason("");
    setAddError("");
    setShowModal(true);
  };

  const handleAddBlocked = async () => {
    if (!newDate) { setAddError("Selecione uma data."); return; }
    setAddLoading(true);
    setAddError("");
    const res = await addBlockedDate(salonId, newDate, newReason || null);
    if (res.error) {
      setAddError(res.error);
      setAddLoading(false);
      return;
    }
    const updated = await getBlockedDates(salonId);
    setBlockedDates(updated);
    setShowModal(false);
    setAddLoading(false);
  };

  const handleRemove = async (id: string) => {
    await removeBlockedDate(id);
    setBlockedDates(prev => prev.filter(d => d.id !== id));
  };

  const today = new Date().toISOString().split("T")[0];

  const sel: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid var(--border)",
    fontFamily: "var(--font-poppins)",
    fontSize: 13,
    color: "var(--text)",
    background: "white",
    outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-poppins)",
    display: "block",
    marginBottom: 6,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-mid)",
    fontFamily: "var(--font-poppins)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 12,
  };

  return (
    <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
        Quando você atende
      </h3>
      <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 22 }}>
        Clientes só verão horários dentro das faixas definidas abaixo.
      </p>

      {/* Dias e horários */}
      <p style={sectionLabel}>Dias e horários</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {hours.map(h => (
          <div key={h.dayOfWeek} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 10,
            background: h.isOpen ? "white" : "oklch(98% 0.003 0)",
            border: `1px solid ${h.isOpen ? "var(--border)" : "oklch(92% 0.005 0)"}`,
          }}>
            <span style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text)", width: 64, flexShrink: 0 }}>
              {DAY_LABELS[h.dayOfWeek]}
            </span>

            {/* Toggle */}
            <button
              onClick={() => updateHour(h.dayOfWeek, "isOpen", !h.isOpen)}
              style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: h.isOpen ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: h.isOpen ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px oklch(0% 0 0 / 0.18)" }} />
            </button>

            {h.isOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <select
                  value={h.opensAt ?? "09:00"}
                  onChange={e => updateHour(h.dayOfWeek, "opensAt", e.target.value)}
                  style={sel}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>até</span>
                <select
                  value={h.closesAt ?? "18:00"}
                  onChange={e => updateHour(h.dayOfWeek, "closesAt", e.target.value)}
                  style={sel}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontStyle: "italic", flex: 1 }}>
                Fechado
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Intervalo */}
      <p style={sectionLabel}>Intervalo entre atendimentos</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <select
          value={intervalMin}
          onChange={e => setIntervalMin(Number(e.target.value))}
          style={{ ...sel, width: 130 }}>
          {[0, 15, 30, 45, 60].map(v => (
            <option key={v} value={v}>{v === 0 ? "Sem intervalo" : `${v} min`}</option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: 0, lineHeight: 1.5 }}>
          Tempo reservado entre atendimentos para deslocamento ou preparação
        </p>
      </div>

      {/* Folgas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ ...sectionLabel, margin: 0 }}>Folgas e feriados</p>
        <button
          onClick={openModal}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--gold)", background: "white", color: "var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          + Adicionar folga
        </button>
      </div>

      {blockedDates.length === 0 ? (
        <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px dashed var(--border)", textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: 0 }}>
            Nenhuma folga cadastrada
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {blockedDates.map(bd => (
            <div key={bd.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "oklch(97% 0.03 15)", border: "1px solid oklch(90% 0.04 15)" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                  {formatBlockedDateLabel(bd.date)}
                </p>
                {bd.reason && (
                  <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{bd.reason}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(bd.id)}
                style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "oklch(65% 0.15 15)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {saveError && (
        <p style={{ fontSize: 12, color: "oklch(50% 0.15 15)", fontFamily: "var(--font-poppins)", margin: "0 0 12px" }}>{saveError}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%", padding: "11px", borderRadius: 10, border: "none",
          background: saved ? "oklch(55% 0.1 145)" : saving ? "var(--border)" : "var(--gold)",
          color: "white", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-poppins)",
          cursor: saving ? "not-allowed" : "pointer", transition: "background 0.3s",
        }}>
        {saved ? "✓ Horários salvos!" : saving ? "Salvando..." : "Salvar horários"}
      </button>

      {/* Modal — adicionar folga */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0% 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 380, boxShadow: "0 8px 40px oklch(0% 0 0 / 0.18)" }}>
            <h4 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: "var(--text)", margin: "0 0 18px" }}>Adicionar folga</h4>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Data *</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                min={today}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Motivo (opcional)</label>
              <input
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="Natal, Viagem, Feriado..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {addError && (
              <p style={{ fontSize: 12, color: "oklch(50% 0.15 15)", fontFamily: "var(--font-poppins)", margin: "0 0 12px" }}>{addError}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1.5px solid var(--border)", background: "white", color: "var(--text)", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={handleAddBlocked}
                disabled={addLoading || !newDate}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: addLoading || !newDate ? "var(--border)" : "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: addLoading || !newDate ? "not-allowed" : "pointer" }}>
                {addLoading ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
