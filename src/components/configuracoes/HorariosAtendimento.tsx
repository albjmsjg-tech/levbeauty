"use client";

import { useState, useEffect } from "react";
import {
  getSalonHours,
  saveSalonHours,
  saveSlotIntervals,
  getBlocks,
  addBlock,
  removeBlock,
} from "@/app/painel/configuracoes/actions";
import type { SalonHour, SalonBlock } from "@/types";

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

const SALON_INTERVAL_OPTIONS = [
  { value: 0,  label: "Sem intervalo" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
];

const HOME_INTERVAL_OPTIONS = [
  { value: 30,  label: "30 min" },
  { value: 60,  label: "1h" },
  { value: 90,  label: "1h30" },
  { value: 120, label: "2h" },
  { value: 150, label: "2h30" },
  { value: 180, label: "3h" },
];

const DEFAULT_HOURS: SalonHour[] = Array.from({ length: 7 }, (_, i) => ({
  id: "",
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5,
  opensAt: i >= 1 && i <= 5 ? "09:00" : i === 6 ? "09:00" : null,
  closesAt: i >= 1 && i <= 5 ? "18:00" : i === 6 ? "14:00" : null,
}));

interface Props {
  salonId: string;
  initialSalonIntervalMin: number;
  initialHomeIntervalMin: number;
}

function formatBlockDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${days[date.getDay()]}, ${d} de ${months[m - 1]} de ${y}`;
}

export function HorariosAtendimento({ salonId, initialSalonIntervalMin, initialHomeIntervalMin }: Props) {
  const [hours, setHours] = useState<SalonHour[]>(DEFAULT_HOURS);
  const [salonIntervalMin, setSalonIntervalMin] = useState(initialSalonIntervalMin);
  const [homeIntervalMin, setHomeIntervalMin] = useState(initialHomeIntervalMin);
  const [blocks, setBlocks] = useState<SalonBlock[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isAllDay, setIsAllDay] = useState(true);
  const [modalDate, setModalDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [modalReason, setModalReason] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [fetched, fetchedBlocks] = await Promise.all([
        getSalonHours(salonId),
        getBlocks(salonId),
      ]);
      if (fetched.length > 0) {
        const merged = DEFAULT_HOURS.map(dh => fetched.find(fh => fh.dayOfWeek === dh.dayOfWeek) ?? dh);
        setHours(merged);
      }
      setBlocks(fetchedBlocks);
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
      saveSlotIntervals(salonId, salonIntervalMin, homeIntervalMin),
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
    setIsAllDay(true);
    setModalDate("");
    setStartTime("09:00");
    setEndTime("10:00");
    setModalReason("");
    setAddError("");
    setShowModal(true);
  };

  const handleAddBlock = async () => {
    if (!modalDate) { setAddError("Selecione uma data."); return; }
    if (!isAllDay) {
      if (startTime >= endTime) { setAddError("O horário de início deve ser antes do fim."); return; }
    }
    setAddLoading(true);
    setAddError("");
    const res = await addBlock(
      salonId,
      modalDate,
      isAllDay ? null : startTime,
      isAllDay ? null : endTime,
      modalReason || null,
    );
    if (res.error) { setAddError(res.error); setAddLoading(false); return; }
    const updated = await getBlocks(salonId);
    setBlocks(updated);
    setShowModal(false);
    setAddLoading(false);
  };

  const handleRemove = async (id: string) => {
    await removeBlock(id);
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const today = new Date().toISOString().split("T")[0];

  // ── styles ────────────────────────────────────────────────
  const sel: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)",
    fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)",
    background: "white", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: "var(--text)",
    fontFamily: "var(--font-poppins)", display: "block", marginBottom: 6,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--text-mid)",
    fontFamily: "var(--font-poppins)", textTransform: "uppercase" as const,
    letterSpacing: "0.07em", marginBottom: 12,
  };

  return (
    <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
        Quando você atende
      </h3>
      <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 22 }}>
        Clientes só verão horários dentro das faixas definidas abaixo.
      </p>

      {/* ── Sub-seção A: Dias e horários ── */}
      <p style={sectionLabel}>Dias e horários</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {hours.map(h => (
          <div key={h.dayOfWeek} style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            background: h.isOpen ? "white" : "oklch(98% 0.003 0)",
            border: `1px solid ${h.isOpen ? "var(--border)" : "oklch(92% 0.005 0)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text)", width: 64 }}>
                {DAY_LABELS[h.dayOfWeek]}
              </span>
              <button
                onClick={() => updateHour(h.dayOfWeek, "isOpen", !h.isOpen)}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: h.isOpen ? "var(--gold)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: h.isOpen ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px oklch(0% 0 0 / 0.18)" }} />
              </button>
            </div>
            {h.isOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 0 180px", minWidth: 0 }}>
                <select value={h.opensAt ?? "09:00"} onChange={e => updateHour(h.dayOfWeek, "opensAt", e.target.value)} style={{ ...sel, flex: 1, minWidth: 0 }}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", flexShrink: 0 }}>até</span>
                <select value={h.closesAt ?? "18:00"} onChange={e => updateHour(h.dayOfWeek, "closesAt", e.target.value)} style={{ ...sel, flex: 1, minWidth: 0 }}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontStyle: "italic", flex: "1 0 auto" }}>Fechado</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Sub-seção B: Intervalos ── */}
      <p style={sectionLabel}>Intervalo entre atendimentos</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", width: 90, flexShrink: 0 }}>No salão</span>
          <select value={salonIntervalMin} onChange={e => setSalonIntervalMin(Number(e.target.value))} style={{ ...sel, width: 130 }}>
            {SALON_INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", width: 90, flexShrink: 0 }}>A domicílio</span>
          <select value={homeIntervalMin} onChange={e => setHomeIntervalMin(Number(e.target.value))} style={{ ...sel, width: 130 }}>
            {HOME_INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 28, lineHeight: 1.5 }}>
        Tempo reservado entre atendimentos para deslocamento ou preparação.
      </p>

      {/* ── Sub-seção C: Folgas e bloqueios ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ ...sectionLabel, margin: 0 }}>Folgas e bloqueios</p>
        <button
          onClick={openModal}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--gold)", background: "white", color: "var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          + Adicionar bloqueio
        </button>
      </div>

      {blocks.length === 0 ? (
        <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px dashed var(--border)", textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: 0 }}>
            Nenhum bloqueio cadastrado
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {blocks.map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "oklch(97% 0.03 15)", border: "1px solid oklch(90% 0.04 15)" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                  🗓️ {formatBlockDate(b.blockDate)}
                  {b.startTime && b.endTime && (
                    <span style={{ fontWeight: 400, color: "var(--text-mid)" }}> · {b.startTime} às {b.endTime}</span>
                  )}
                </p>
                {b.reason && (
                  <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{b.reason}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(b.id)}
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

      {/* ── Modal: adicionar bloqueio ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0% 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px oklch(0% 0 0 / 0.18)" }}>
            <h4 style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: "var(--text)", margin: "0 0 18px" }}>Adicionar bloqueio</h4>

            {/* Toggle dia inteiro vs parcial */}
            <div style={{ display: "flex", background: "oklch(96% 0.01 0)", borderRadius: 10, padding: 4, marginBottom: 18, gap: 4 }}>
              {[{ val: true, label: "Dia inteiro" }, { val: false, label: "Horário específico" }].map(opt => (
                <button key={String(opt.val)}
                  onClick={() => setIsAllDay(opt.val)}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, cursor: "pointer", background: isAllDay === opt.val ? "var(--gold)" : "transparent", color: isAllDay === opt.val ? "white" : "var(--text-mid)", transition: "all 0.15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Data *</label>
              <input
                type="date"
                value={modalDate}
                onChange={e => setModalDate(e.target.value)}
                min={today}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {!isAllDay && (
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Início *</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Fim *</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Motivo (opcional)</label>
              <input
                value={modalReason}
                onChange={e => setModalReason(e.target.value)}
                placeholder="Natal, Almoço, Viagem..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {addError && (
              <p style={{ fontSize: 12, color: "oklch(50% 0.15 15)", fontFamily: "var(--font-poppins)", margin: "0 0 12px" }}>{addError}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1.5px solid var(--border)", background: "white", color: "var(--text)", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleAddBlock} disabled={addLoading || !modalDate}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: addLoading || !modalDate ? "var(--border)" : "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: addLoading || !modalDate ? "not-allowed" : "pointer" }}>
                {addLoading ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
