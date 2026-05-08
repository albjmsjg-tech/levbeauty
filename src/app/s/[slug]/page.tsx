"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SalonData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  home_enabled: boolean;
}

interface ServiceData {
  id: string;
  name: string;
  emoji: string;
  duration_min: number;
  price: number;
}

type Step = "list" | "date" | "time" | "info" | "done";

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function getNext14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(d: Date): string {
  return `${DAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function generateAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 19; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function isAvailable(
  slot: string,
  svcDuration: number,
  booked: { appt_time: string; duration_min: number }[]
): boolean {
  const slotStart = toMinutes(slot);
  const slotEnd = slotStart + svcDuration;
  for (const b of booked) {
    const bStart = toMinutes(b.appt_time);
    const bEnd = bStart + b.duration_min;
    if (slotStart < bEnd && slotEnd > bStart) return false;
  }
  return true;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ALL_SLOTS = generateAllSlots();

export default function SalonPage({ params }: { params: { slug: string } }) {
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<Step>("list");
  const [selectedSvc, setSelectedSvc] = useState<ServiceData | null>(null);
  const [location, setLocation] = useState<"salon" | "home">("salon");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<{ appt_time: string; duration_min: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const dates = getNext14Days();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("id, name, slug, phone, address, home_enabled")
        .eq("slug", params.slug)
        .single();

      if (salonErr || !salonData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSalon(salonData);

      const { data: svcData } = await supabase
        .from("services")
        .select("id, name, emoji, duration_min, price")
        .eq("salon_id", salonData.id)
        .eq("active", true)
        .order("name");

      setServices(svcData ?? []);
      setLoading(false);
    }
    load();
  }, [params.slug]);

  const handleSelectService = (svc: ServiceData) => {
    setSelectedSvc(svc);
    setSelectedDate("");
    setSelectedTime("");
    setStep("date");
  };

  const handlePickDate = async (dateStr: string) => {
    if (!salon || !selectedSvc) return;
    setSelectedDate(dateStr);
    setSelectedTime("");
    setLoadingSlots(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_booked_slots", {
      p_salon_id: salon.id,
      p_date: dateStr,
    });
    setBookedSlots(data ?? []);
    setLoadingSlots(false);
    setStep("time");
  };

  const handleBook = async () => {
    if (!salon || !selectedSvc || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError("");
    const supabase = createClient();
    const { error } = await supabase.from("appointments").insert({
      salon_id: salon.id,
      client_id: null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      service_id: selectedSvc.id,
      service_name: selectedSvc.name,
      appt_date: selectedDate,
      appt_time: selectedTime,
      duration_min: selectedSvc.duration_min,
      price: selectedSvc.price,
      location,
    });
    if (error) {
      setSubmitError("Erro ao confirmar agendamento. Tente novamente.");
      setSubmitting(false);
      return;
    }
    setStep("done");
    setSubmitting(false);
  };

  const resetBooking = () => {
    setStep("list");
    setSelectedSvc(null);
    setLocation("salon");
    setSelectedDate("");
    setSelectedTime("");
    setClientName("");
    setClientPhone("");
    setSubmitError("");
  };

  // ── styles ──────────────────────────────────────────
  const fieldStyle: React.CSSProperties = {
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
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-poppins)",
    display: "block",
    marginBottom: 6,
  };
  const backBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    color: "var(--text-mid)",
    fontFamily: "var(--font-poppins)",
    fontSize: 14,
    cursor: "pointer",
    marginBottom: 20,
    padding: 0,
  };

  // ── loading / 404 ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))" }}>
        <p style={{ fontFamily: "var(--font-poppins)", color: "var(--text-light)", fontSize: 14 }}>Carregando...</p>
      </div>
    );
  }

  if (notFound || !salon) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))", padding: 24 }}>
        <div style={{ fontSize: 48 }}>💅</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, color: "var(--mauve-dark)", textAlign: "center" }}>Salão não encontrado</h1>
        <p style={{ fontFamily: "var(--font-poppins)", color: "var(--text-light)", fontSize: 14, textAlign: "center" }}>O link que você acessou não existe ou foi removido.</p>
        <Link href="/" style={{ color: "var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>← Voltar ao início</Link>
      </div>
    );
  }

  // ── page ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, oklch(97% 0.012 75), oklch(93% 0.03 10))" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, oklch(28% 0.055 340), oklch(20% 0.04 340))", padding: "36px 24px 32px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", boxShadow: "0 4px 20px oklch(72% 0.115 75 / 0.4)" }}>💅</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 600, color: "white", margin: "0 0 6px" }}>{salon.name}</h1>
        {salon.address && (
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "oklch(80% 0.02 340)", margin: 0 }}>📍 {salon.address}</p>
        )}
        {salon.phone && (
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "oklch(80% 0.02 340)", margin: "4px 0 0" }}>📞 {salon.phone}</p>
        )}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 48px" }}>

        {/* ── STEP: list ────────────────────────────── */}
        {step === "list" && (
          <>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, color: "var(--text)", margin: "0 0 20px" }}>Nossos serviços</h2>

            {services.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14 }}>
                Nenhum serviço disponível no momento.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {services.map(svc => (
                  <div key={svc.id} style={{ background: "white", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 12px oklch(40% 0.04 340 / 0.06)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, background: "oklch(97% 0.03 75)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                      {svc.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 15, color: "var(--text)", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</p>
                      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0 }}>{svc.duration_min} min</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: 16, color: "var(--gold)", margin: "0 0 8px" }}>{fmt(svc.price)}</p>
                      <button
                        onClick={() => handleSelectService(svc)}
                        style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px oklch(72% 0.115 75 / 0.3)" }}>
                        Agendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 40, textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)" }}>
                Agendamento online por{" "}
                <span style={{ color: "var(--gold)", fontWeight: 600 }}>LevBeauty</span>
              </p>
            </div>
          </>
        )}

        {/* ── STEP: date ────────────────────────────── */}
        {step === "date" && selectedSvc && (
          <>
            <button onClick={() => setStep("list")} style={backBtn}>← Voltar</button>

            {/* Selected service summary */}
            <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{selectedSvc.emoji}</span>
              <div>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: 0 }}>{selectedSvc.name}</p>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{selectedSvc.duration_min} min · {fmt(selectedSvc.price)}</p>
              </div>
            </div>

            {/* Location selector */}
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontFamily: "var(--font-poppins)", fontSize: 11, fontWeight: 700, color: "var(--text-mid)", letterSpacing: "0.07em", margin: "0 0 10px" }}>LOCAL DO ATENDIMENTO</p>
              {salon.home_enabled ? (
                <div style={{ display: "flex", gap: 10 }}>
                  {(["salon", "home"] as const).map(loc => (
                    <button key={loc} onClick={() => setLocation(loc)}
                      style={{ flex: 1, padding: "11px 8px", borderRadius: 11, border: `1.5px solid ${location === loc ? "var(--gold)" : "var(--border)"}`, background: location === loc ? "oklch(97% 0.04 75)" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 18 }}>{loc === "salon" ? "🏪" : "🏠"}</span>
                      <span style={{ fontSize: 12, fontWeight: location === loc ? 700 : 400, color: location === loc ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                        {loc === "salon" ? "No Salão" : "Em Casa"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ background: "oklch(97% 0.01 0)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
                  <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0, lineHeight: 1.5 }}>
                    Atendimento <strong style={{ color: "var(--text)" }}>apenas no salão</strong>. A profissional ainda não habilitou visitas a domicílio.
                  </p>
                </div>
              )}
            </div>

            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", margin: "0 0 18px" }}>Escolha a data</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {dates.map(d => {
                const dateStr = toISODate(d);
                const isToday = toISODate(new Date()) === dateStr;
                const isSelected = selectedDate === dateStr;
                return (
                  <button key={dateStr} onClick={() => handlePickDate(dateStr)}
                    style={{ padding: "12px 6px", borderRadius: 10, border: `1.5px solid ${isSelected ? "var(--gold)" : "var(--border)"}`, background: isSelected ? "oklch(97% 0.04 75)" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.15s" }}>
                    <span style={{ fontFamily: "var(--font-poppins)", fontSize: 10, color: isSelected ? "var(--gold)" : "var(--text-light)", fontWeight: 500 }}>{DAYS_PT[d.getDay()]}</span>
                    <span style={{ fontFamily: "var(--font-poppins)", fontSize: 20, fontWeight: 700, color: isSelected ? "var(--gold)" : "var(--text)", lineHeight: 1.2 }}>{d.getDate()}</span>
                    <span style={{ fontFamily: "var(--font-poppins)", fontSize: 10, color: isSelected ? "var(--gold)" : "var(--text-light)" }}>{MONTHS_PT[d.getMonth()]}</span>
                    {isToday && <span style={{ fontFamily: "var(--font-poppins)", fontSize: 9, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.03em" }}>HOJE</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── STEP: time ────────────────────────────── */}
        {step === "time" && selectedSvc && selectedDate && (
          <>
            <button onClick={() => setStep("date")} style={backBtn}>← Voltar</button>

            <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{selectedSvc.emoji}</span>
              <div>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: 0 }}>{selectedSvc.name}</p>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>
                  {formatDateDisplay(dates.find(d => toISODate(d) === selectedDate)!)} · {fmt(selectedSvc.price)}
                </p>
              </div>
            </div>

            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", margin: "0 0 18px" }}>Escolha o horário</h2>

            {loadingSlots ? (
              <p style={{ fontFamily: "var(--font-poppins)", color: "var(--text-light)", fontSize: 14 }}>Verificando disponibilidade...</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {ALL_SLOTS.map(slot => {
                  const available = isAvailable(slot, selectedSvc.duration_min, bookedSlots);
                  const isSelected = selectedTime === slot;
                  return (
                    <button key={slot}
                      onClick={() => available && setSelectedTime(slot)}
                      disabled={!available}
                      style={{
                        padding: "10px 4px",
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? "var(--gold)" : available ? "var(--border)" : "oklch(92% 0.005 0)"}`,
                        background: isSelected ? "oklch(97% 0.04 75)" : available ? "white" : "oklch(96% 0.003 0)",
                        color: isSelected ? "var(--gold)" : available ? "var(--text)" : "oklch(78% 0.005 0)",
                        fontFamily: "var(--font-poppins)",
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 400,
                        cursor: available ? "pointer" : "not-allowed",
                        textDecoration: !available ? "line-through" : "none",
                        transition: "all 0.12s",
                      }}>
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTime && (
              <button onClick={() => setStep("info")}
                style={{ marginTop: 24, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", cursor: "pointer" }}>
                Continuar →
              </button>
            )}
          </>
        )}

        {/* ── STEP: info ────────────────────────────── */}
        {step === "info" && selectedSvc && selectedDate && selectedTime && (
          <>
            <button onClick={() => setStep("time")} style={backBtn}>← Voltar</button>

            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, color: "var(--text)", margin: "0 0 4px" }}>Seus dados</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)", margin: "0 0 22px" }}>Para confirmar seu agendamento</p>

            {/* Booking summary */}
            <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 12, padding: "14px 16px", border: "1px solid oklch(90% 0.04 75)", marginBottom: 24 }}>
              <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-mid)", margin: 0, lineHeight: 1.7 }}>
                <strong style={{ color: "var(--text)" }}>{selectedSvc.emoji} {selectedSvc.name}</strong><br />
                {formatDateDisplay(dates.find(d => toISODate(d) === selectedDate)!)} às {selectedTime}<br />
                <strong style={{ color: "var(--gold)" }}>{fmt(selectedSvc.price)}</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Seu nome *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Fernanda Silva" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp *</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(11) 99999-0000" style={fieldStyle} />
              </div>
            </div>

            {submitError && (
              <div style={{ background: "oklch(96% 0.03 15)", border: "1px solid oklch(88% 0.06 15)", borderRadius: 9, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "oklch(48% 0.12 15)", fontFamily: "var(--font-poppins)", margin: 0 }}>{submitError}</p>
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={submitting || !clientName.trim() || !clientPhone.trim()}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: submitting || !clientName.trim() || !clientPhone.trim() ? "var(--border)" : "var(--gold)",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-poppins)",
                boxShadow: submitting || !clientName.trim() || !clientPhone.trim() ? "none" : "0 4px 14px oklch(72% 0.115 75 / 0.35)",
                cursor: submitting || !clientName.trim() || !clientPhone.trim() ? "not-allowed" : "pointer",
              }}>
              {submitting ? "Confirmando..." : "Confirmar agendamento ✓"}
            </button>
          </>
        )}

        {/* ── STEP: done ────────────────────────────── */}
        {step === "done" && selectedSvc && selectedDate && selectedTime && (
          <div style={{ textAlign: "center", paddingTop: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, oklch(88% 0.055 10), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 4px 18px oklch(72% 0.115 75 / 0.35)" }}>
              <span style={{ color: "white", fontSize: 32 }}>✓</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 26, color: "var(--text)", margin: "0 0 8px" }}>Agendado!</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", margin: "0 0 24px" }}>
              Seu agendamento foi confirmado.
            </p>

            {/* Booking details */}
            <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--border)", marginBottom: 20, textAlign: "left" }}>
              <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.8 }}>
                <strong>{selectedSvc.emoji} {selectedSvc.name}</strong><br />
                <span style={{ color: "var(--text-mid)" }}>
                  {formatDateDisplay(dates.find(d => toISODate(d) === selectedDate)!)} às {selectedTime}
                </span><br />
                <span style={{ color: "var(--text-mid)" }}>{salon.name}</span>
                {salon.phone && <><br /><span style={{ color: "var(--text-mid)" }}>📞 {salon.phone}</span></>}
              </p>
            </div>

            {/* CTA: criar conta */}
            <div style={{ background: "oklch(97% 0.03 75)", borderRadius: 14, padding: "20px", border: "1px solid oklch(90% 0.04 75)", marginBottom: 24 }}>
              <p style={{ fontFamily: "var(--font-playfair)", fontSize: 17, color: "var(--text)", margin: "0 0 6px" }}>Quer ver seu histórico?</p>
              <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)", margin: "0 0 16px", lineHeight: 1.5 }}>
                Crie uma conta grátis e acompanhe todos os seus agendamentos.
              </p>
              <Link
                href="/cadastro-cliente"
                style={{ display: "block", padding: "12px", borderRadius: 10, background: "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, textDecoration: "none", textAlign: "center", boxShadow: "0 2px 10px oklch(72% 0.115 75 / 0.3)" }}>
                Criar conta grátis
              </Link>
            </div>

            <button onClick={resetBooking}
              style={{ background: "none", border: "none", color: "var(--gold)", fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Fazer outro agendamento
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
