"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Scissors, Home, Info, Check, CreditCard, DollarSign } from "lucide-react";
import { Suspense } from "react";
import { defaultServices, defaultSalonConfig, timeSlots } from "@/lib/data";
import { fmt, formatCEP, estimateDistance } from "@/lib/utils";

function AgendarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const svcId = params.get("id");
  const service = defaultServices.find(s => String(s.id) === svcId) || defaultServices[0];

  const cfg = defaultSalonConfig;
  const [location, setLocation] = useState<"salon" | "home">("salon");
  const [cep, setCep] = useState("");
  const [cepChecked, setCepChecked] = useState(false);
  const [cepDistance, setCepDistance] = useState<number | null>(null);
  const [cepError, setCepError] = useState("");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [payment, setPayment] = useState<"pix" | "credit" | "local">("pix");
  const [booked, setBooked] = useState(false);

  const checkCep = () => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length < 8) { setCepError("CEP inválido. Digite os 8 dígitos."); return; }
    const dist = estimateDistance(cleaned, cfg.cepBase);
    setCepDistance(dist);
    setCepChecked(true);
    setCepError(dist > cfg.maxRadiusKm ? `Seu CEP está a ${dist.toFixed(1)} km — fora do raio de ${cfg.maxRadiusKm} km.` : "");
  };

  const homeAvailable = cfg.homeEnabled && cepChecked && cepDistance !== null && cepDistance <= cfg.maxRadiusKm;
  const travelFee = useMemo(() => {
    if (location !== "home" || !cepChecked || !cepDistance || cepDistance > cfg.maxRadiusKm) return 0;
    return Math.max(cfg.minTravelFee, cepDistance * 2 * cfg.pricePerKm);
  }, [location, cepChecked, cepDistance, cfg]);

  const cardFee = payment === "credit" ? service.price * 0.0329 : 0;
  const total = service.price + travelFee + cardFee;

  const daysInMonth = 31;
  const firstDay = 4;
  const today = 4;

  const slots = location === "home" ? timeSlots.slice(0, -4) : timeSlots;

  if (booked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "90vh", padding: "40px 28px", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, oklch(88% 0.055 10), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 6px 24px oklch(72% 0.115 75 / 0.3)" }}>
          <Check size={36} color="white" />
        </div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Agendado!</h2>
        <p style={{ fontSize: 14, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", lineHeight: 1.5, marginBottom: 24 }}>Seu agendamento foi confirmado. Você receberá uma notificação de lembrete.</p>
        <div style={{ background: "white", borderRadius: 16, padding: 18, width: "100%", border: "1px solid var(--border)", textAlign: "left", marginBottom: 24 }}>
          {[
            { label: "Serviço", val: service.name },
            { label: "Data", val: `${selectedDate} de Maio, 2026` },
            { label: "Horário", val: selectedTime },
            { label: "Local", val: location === "salon" ? "Salão LevBeauty" : "Seu endereço" },
            { label: "Total", val: fmt(total) },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{r.val}</span>
            </div>
          ))}
        </div>
        <button onClick={() => router.push("/app")} style={{ width: "100%", padding: 14, borderRadius: 14, background: "var(--gold)", border: "none", color: "white", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins)" }}>
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, oklch(88% 0.055 10), oklch(82% 0.065 350))", padding: "20px 20px 28px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, marginBottom: 16, cursor: "pointer" }}>
          <ChevronLeft size={18} color="var(--mauve)" />
          <span style={{ fontSize: 13, color: "var(--mauve)", fontFamily: "var(--font-poppins)" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 2px 12px oklch(40% 0.05 10 / 0.15)" }}>💅</div>
          <div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--mauve-dark)" }}>{service.name}</h2>
            <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>{service.desc}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        {/* Location */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10, letterSpacing: "0.03em" }}>LOCAL DO ATENDIMENTO</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setLocation("salon"); setCepChecked(false); setCepDistance(null); setCepError(""); }}
              style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${location === "salon" ? "var(--gold)" : "var(--border)"}`, background: location === "salon" ? "oklch(95% 0.045 75)" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Scissors size={18} color={location === "salon" ? "var(--gold)" : "var(--text-light)"} />
              <span style={{ fontSize: 12, fontWeight: location === "salon" ? 600 : 400, color: location === "salon" ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>No Salão</span>
            </button>
            {cfg.homeEnabled && (
              <button onClick={() => setLocation("home")}
                style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${location === "home" ? "var(--gold)" : "var(--border)"}`, background: location === "home" ? "oklch(95% 0.045 75)" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Home size={18} color={location === "home" ? "var(--gold)" : "var(--text-light)"} />
                <span style={{ fontSize: 12, fontWeight: location === "home" ? 600 : 400, color: location === "home" ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>Em Casa</span>
              </button>
            )}
          </div>

          {location === "home" && (
            <div style={{ marginTop: 12, background: "oklch(98% 0.015 75)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 8 }}>Informe seu CEP para verificar disponibilidade</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={cep} onChange={e => { setCep(formatCEP(e.target.value)); setCepChecked(false); setCepDistance(null); setCepError(""); }}
                  placeholder="00000-000" maxLength={9} style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${cepError ? "oklch(60% 0.12 15)" : cepChecked && !cepError ? "oklch(55% 0.1 145)" : "var(--border)"}`, fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)" }} />
                <button onClick={checkCep} style={{ padding: "9px 14px", borderRadius: 9, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)" }}>Verificar</button>
              </div>
              {cepError && <p style={{ fontSize: 11, color: "oklch(50% 0.12 15)", fontFamily: "var(--font-poppins)", marginTop: 7, display: "flex", alignItems: "center", gap: 4 }}><Info size={12} color="oklch(50% 0.12 15)" /> {cepError}</p>}
              {cepChecked && !cepError && cepDistance !== null && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: "oklch(40% 0.1 145)", fontFamily: "var(--font-poppins)", display: "flex", alignItems: "center", gap: 4 }}><Check size={12} color="oklch(40% 0.1 145)" /> Disponível! Distância estimada: {cepDistance.toFixed(1)} km</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>Taxa de deslocamento: R$ {travelFee.toFixed(2)} (ida + volta)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calendar */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10, letterSpacing: "0.03em" }}>ESCOLHA UMA DATA</p>
          <div style={{ background: "white", borderRadius: 16, padding: 14, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Maio 2026</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 500, paddingBottom: 4 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const past = day < today;
                const sel = selectedDate === day;
                return (
                  <button key={day} onClick={() => !past && setSelectedDate(day)}
                    style={{ aspectRatio: "1", borderRadius: "50%", border: "none", background: sel ? "var(--gold)" : day === today ? "oklch(92% 0.04 75)" : "transparent", cursor: past ? "default" : "pointer", opacity: past ? 0.3 : 1, fontSize: 12, fontWeight: sel ? 700 : 400, color: sel ? "white" : "var(--text)", fontFamily: "var(--font-poppins)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (location === "salon" || homeAvailable) && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10, letterSpacing: "0.03em" }}>
              HORÁRIO DISPONÍVEL {location === "home" && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-light)", marginLeft: 8 }}>2h de buffer inclusos</span>}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {slots.map(t => (
                <button key={t} onClick={() => setSelectedTime(t)}
                  style={{ padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${selectedTime === t ? "var(--gold)" : "var(--border)"}`, background: selectedTime === t ? "var(--gold)" : "white", cursor: "pointer", fontSize: 12, fontWeight: selectedTime === t ? 600 : 400, color: selectedTime === t ? "white" : "var(--text)", fontFamily: "var(--font-poppins)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment */}
        {selectedTime && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10, letterSpacing: "0.03em" }}>PAGAMENTO</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { v: "pix" as const, label: "Pix", sub: "Sem taxas", icon: <span style={{ fontSize: 16 }}>⚡</span> },
                { v: "credit" as const, label: "Cartão de Crédito", sub: "Taxa de 3,29%", icon: <CreditCard size={18} color={payment === "credit" ? "var(--gold)" : "var(--text-light)"} /> },
                { v: "local" as const, label: "Presencial", sub: "No dia do atendimento", icon: <DollarSign size={18} color={payment === "local" ? "var(--gold)" : "var(--text-light)"} /> },
              ].map(opt => (
                <button key={opt.v} onClick={() => setPayment(opt.v)}
                  style={{ padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${payment === opt.v ? "var(--gold)" : "var(--border)"}`, background: payment === opt.v ? "oklch(97% 0.04 75)" : "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                  {opt.icon}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1 }}>{opt.sub}</p>
                  </div>
                  {payment === opt.v && <Check size={16} color="var(--gold)" />}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div style={{ marginTop: 16, background: "oklch(97% 0.015 75)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", marginBottom: 10 }}>Resumo</p>
              {[
                { label: service.name, val: fmt(service.price) },
                ...(travelFee > 0 ? [{ label: `Deslocamento (${cepDistance?.toFixed(1)} km × 2)`, val: fmt(travelFee) }] : []),
                ...(cardFee > 0 ? [{ label: "Taxa cartão (3,29%)", val: fmt(cardFee) }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{row.val}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>Total</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-poppins)", color: "var(--gold)" }}>{fmt(total)}</span>
              </div>
            </div>

            <button onClick={() => setBooked(true)}
              style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 14, background: "linear-gradient(135deg, var(--gold), oklch(65% 0.13 65))", border: "none", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 15, fontWeight: 600, color: "white", boxShadow: "0 4px 18px oklch(72% 0.115 75 / 0.4)" }}>
              Confirmar Agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-poppins)", color: "var(--text-light)" }}>Carregando…</div>}>
      <AgendarContent />
    </Suspense>
  );
}
