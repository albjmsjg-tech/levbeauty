"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { bookAppointment } from "./actions";

interface SalonData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  home_enabled: boolean;
  home_salon: boolean;
  requires_deposit: boolean;
  cep_base: string | null;
  max_radius_km: number;
  price_per_km: number;
  min_travel_fee: number;
}

interface ServiceData {
  id: string;
  name: string;
  emoji: string;
  duration_min: number;
  price: number;
}

type Step = "list" | "location" | "cep" | "date" | "time" | "info" | "done";

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

function formatCEP(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

async function geocodeCEP(cep: string): Promise<{ lat: number; lng: number } | null> {
  const clean = cep.replace(/\D/g, "");

  // 1. Nominatim via postalcode — rápido, funciona para muitos CEPs
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${clean}&country=BR&format=json&limit=1`,
      { headers: { "User-Agent": "LevBeauty/1.0" } }
    );
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* continua */ }

  // 2. ViaCEP → logradouro + cidade → Nominatim (funciona quando postalcode falha)
  try {
    const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (viaRes.ok) {
      const via = await viaRes.json() as {
        erro?: boolean;
        logradouro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!via.erro && via.logradouro && via.localidade) {
        const q = `${via.logradouro}, ${via.localidade}, ${via.uf}, Brasil`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
          { headers: { "User-Agent": "LevBeauty/1.0" } }
        );
        const data = await res.json() as Array<{ lat: string; lon: string }>;
        if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch { /* continua */ }

  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aCos =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aCos), Math.sqrt(1 - aCos));
  return R * c;
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
  const [paymentDone, setPaymentDone] = useState(false);
  const [bookingFailed, setBookingFailed] = useState(false);

  // CEP state
  const [clientCep, setClientCep] = useState("");
  const [cepChecking, setCepChecking] = useState(false);
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  const [cepError, setCepError] = useState("");
  const [travelFee, setTravelFee] = useState(0);

  const dates = getNext14Days();

  // Handle payment_done redirect
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment_done") === "1") {
      try {
        const saved = sessionStorage.getItem("lbpb");
        if (saved) {
          const data = JSON.parse(saved) as {
            svc: ServiceData;
            date: string;
            time: string;
            clientName: string;
            clientPhone: string;
          };
          setSelectedSvc(data.svc);
          setSelectedDate(data.date);
          setSelectedTime(data.time);
          setClientName(data.clientName);
          setClientPhone(data.clientPhone);
          sessionStorage.removeItem("lbpb");
        }
      } catch {
        // ignore
      }
      setPaymentDone(true);
      setStep("done");
    }
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("id, name, slug, phone, address, home_enabled, home_salon, requires_deposit, cep_base, max_radius_km, price_per_km, min_travel_fee")
        .eq("slug", params.slug)
        .single();

      if (salonErr || !salonData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const sd = salonData as SalonData;
      console.log("[LevBeauty] salon loaded:", { name: sd.name, home_enabled: sd.home_enabled, home_salon: sd.home_salon, cep_base: sd.cep_base });
      setSalon(sd);

      const { data: svcData } = await supabase
        .from("services")
        .select("id, name, emoji, duration_min, price")
        .eq("salon_id", salonData.id)
        .eq("active", true)
        .order("name");

      setServices((svcData ?? []) as ServiceData[]);
      setLoading(false);
    }
    load();
  }, [params.slug]);

  // Reset CEP validation state when input changes
  useEffect(() => {
    const digits = clientCep.replace(/\D/g, "");
    if (digits.length < 8) {
      setCepValid(null);
      setCepError("");
      setTravelFee(0);
    }
  }, [clientCep]);

  const verifyCep = async () => {
    if (!salon) return;
    const digits = clientCep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepError("Digite o CEP completo (8 dígitos).");
      return;
    }
    setCepChecking(true);
    setCepValid(null);
    setCepError("");
    setTravelFee(0);

    // Step 1: ViaCEP format check
    try {
      const viares = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const viaData = await viares.json() as { erro?: boolean };
      if (viaData.erro) {
        setCepValid(false);
        setCepError("CEP inválido ou não encontrado.");
        setCepChecking(false);
        return;
      }
    } catch {
      // ViaCEP failed, continue to geocode
    }

    if (!salon.cep_base) {
      // No base CEP configured — allow with min travel fee
      setCepValid(true);
      setTravelFee(Number(salon.min_travel_fee));
      setCepChecking(false);
      return;
    }

    // Step 2: Geocode both CEPs and check radius
    const [clientCoords, salonCoords] = await Promise.all([
      geocodeCEP(digits),
      geocodeCEP(salon.cep_base),
    ]);

    if (!clientCoords || !salonCoords) {
      // Geocoding failed — graceful fallback with min fee
      setCepValid(true);
      setTravelFee(Number(salon.min_travel_fee));
      setCepChecking(false);
      return;
    }

    const distKm = haversineKm(clientCoords, salonCoords);

    if (distKm > Number(salon.max_radius_km)) {
      setCepValid(false);
      setCepError(`Fora da nossa área de atendimento (${distKm.toFixed(1)} km — raio máximo ${salon.max_radius_km} km).`);
      setCepChecking(false);
      return;
    }

    const fee = Math.max(Number(salon.min_travel_fee), distKm * 2 * Number(salon.price_per_km));
    setCepValid(true);
    setTravelFee(fee);
    setCepChecking(false);
  };

  // Location logic based on home_salon and home_enabled
  function getLocationMode(s: SalonData): "picker" | "force-salon" | "force-home" {
    if (s.home_salon && s.home_enabled) return "picker";
    if (s.home_enabled && !s.home_salon) return "force-home";
    return "force-salon";
  }

  const handleSelectService = (svc: ServiceData) => {
    setSelectedSvc(svc);
    setSelectedDate("");
    setSelectedTime("");
    setCepValid(null);
    setCepError("");
    setTravelFee(0);
    setClientCep("");

    if (salon) {
      const mode = getLocationMode(salon);
      if (mode === "force-home") {
        setLocation("home");
        setStep("cep");           // home-only: go straight to CEP step
      } else if (mode === "picker") {
        setLocation("salon");
        setStep("location");      // show location picker first
      } else {
        setLocation("salon");
        setStep("date");          // salon-only: skip straight to calendar
      }
    }
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

    // Feature 4: Stripe deposit
    if (salon.requires_deposit) {
      sessionStorage.setItem("lbpb", JSON.stringify({
        svc: selectedSvc,
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
      }));
      try {
        const res = await fetch("/api/stripe/deposit-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salon_id: salon.id,
            service_name: selectedSvc.name,
            duration_min: selectedSvc.duration_min,
            price: selectedSvc.price,
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            appt_date: selectedDate,
            appt_time: selectedTime,
            location,
            slug: salon.slug,
            client_cep: clientCep || undefined,
            travel_fee: travelFee || undefined,
          }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setSubmitError(data.error ?? "Erro ao iniciar pagamento.");
      } catch {
        setSubmitError("Erro ao conectar com servidor de pagamento.");
      }
      setSubmitting(false);
      return;
    }

    // Normal booking (no deposit) — handled server-side via bookAppointment()
    const result = await bookAppointment({
      salonId: salon.id,
      serviceId: selectedSvc.id,
      serviceName: selectedSvc.name,
      apptDate: selectedDate,
      apptTime: selectedTime,
      durationMin: selectedSvc.duration_min,
      clientName,
      clientPhone,
      paymentMethod: "local",
      price: selectedSvc.price,
      location: location === "home" ? "domicilio" : "salao",
      clientCep: clientCep || undefined,
      travelFee: travelFee || undefined,
      salonName: salon.name,
      salonPhone: salon.phone,
      salonAddress: salon.address,
    });
    if (!result.ok) {
      setBookingFailed(true);
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
    setClientCep("");
    setCepValid(null);
    setCepError("");
    setTravelFee(0);
    setSubmitError("");
    setPaymentDone(false);
    setBookingFailed(false);
    setBookedSlots([]);
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

        {/* ── STEP: location ───────────────────────── */}
        {step === "location" && selectedSvc && salon && (
          <>
            <button onClick={() => setStep("list")} style={backBtn}>← Voltar</button>

            <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", marginBottom: 28, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{selectedSvc.emoji}</span>
              <div>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: 0 }}>{selectedSvc.name}</p>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{selectedSvc.duration_min} min · {fmt(selectedSvc.price)}</p>
              </div>
            </div>

            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, color: "var(--text)", margin: "0 0 6px" }}>Onde será o atendimento?</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)", margin: "0 0 22px" }}>Escolha o local</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {(["salon", "home"] as const).map(loc => (
                <button key={loc}
                  onClick={() => setLocation(loc)}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 14, border: `2px solid ${location === loc ? "var(--gold)" : "var(--border)"}`, background: location === loc ? "oklch(97% 0.04 75)" : "white", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 32 }}>{loc === "salon" ? "🏪" : "🏠"}</span>
                  <div>
                    <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: 15, color: location === loc ? "var(--gold)" : "var(--text)", margin: "0 0 2px" }}>
                      {loc === "salon" ? "No Salão" : "Em Casa"}
                    </p>
                    <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0 }}>
                      {loc === "salon" ? salon.address || "Atendimento no nosso espaço" : "Enviamos uma profissional até você"}
                    </p>
                  </div>
                  <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", border: `2px solid ${location === loc ? "var(--gold)" : "var(--border)"}`, background: location === loc ? "var(--gold)" : "white", flexShrink: 0 }} />
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (location === "home") setStep("cep");
                else setStep("date");
              }}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", cursor: "pointer" }}>
              Próximo →
            </button>
          </>
        )}

        {/* ── STEP: cep ─────────────────────────────── */}
        {step === "cep" && selectedSvc && (
          <>
            <button onClick={() => setStep(getLocationMode(salon!) === "force-home" ? "list" : "location")} style={backBtn}>← Voltar</button>

            <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", marginBottom: 28, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{selectedSvc.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: 0 }}>{selectedSvc.name}</p>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{selectedSvc.duration_min} min · {fmt(selectedSvc.price)}</p>
              </div>
              <span style={{ fontSize: 12, background: "oklch(97% 0.04 75)", border: "1px solid oklch(90% 0.04 75)", color: "var(--gold)", fontFamily: "var(--font-poppins)", fontWeight: 600, padding: "4px 10px", borderRadius: 8 }}>🏠 Em Casa</span>
            </div>

            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, color: "var(--text)", margin: "0 0 6px" }}>Qual o seu CEP?</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)", margin: "0 0 22px", lineHeight: 1.5 }}>
              Vamos verificar se estamos dentro da sua área de atendimento e calcular a taxa de deslocamento.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CEP</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={clientCep}
                  onChange={e => setClientCep(formatCEP(e.target.value))}
                  onKeyDown={e => e.key === "Enter" && verifyCep()}
                  placeholder="00000-000"
                  maxLength={9}
                  autoFocus
                  style={{
                    ...fieldStyle,
                    flex: 1,
                    borderColor: cepValid === false
                      ? "oklch(65% 0.15 15)"
                      : cepValid === true
                        ? "oklch(55% 0.12 145)"
                        : "var(--border)",
                  }}
                />
                <button
                  onClick={verifyCep}
                  disabled={cepChecking || clientCep.replace(/\D/g, "").length !== 8}
                  style={{
                    padding: "0 20px",
                    borderRadius: 10,
                    border: "none",
                    background: cepChecking || clientCep.replace(/\D/g, "").length !== 8 ? "var(--border)" : "var(--gold)",
                    color: "white",
                    fontFamily: "var(--font-poppins)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: cepChecking || clientCep.replace(/\D/g, "").length !== 8 ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}>
                  {cepChecking ? "Verificando..." : "Verificar"}
                </button>
              </div>

              {cepValid === null && !cepChecking && (
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "8px 0 0" }}>
                  Digite o CEP e clique em Verificar.
                </p>
              )}
              {cepChecking && (
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", margin: "8px 0 0" }}>
                  Consultando ViaCEP e calculando distância...
                </p>
              )}
              {!cepChecking && cepValid === true && (
                <div style={{ background: "oklch(94% 0.06 145)", border: "1px solid oklch(80% 0.1 145)", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                  <p style={{ fontSize: 13, color: "oklch(32% 0.1 145)", fontFamily: "var(--font-poppins)", fontWeight: 600, margin: 0 }}>
                    ✓ Dentro da área de atendimento
                  </p>
                  {travelFee > 0 && (
                    <p style={{ fontSize: 12, color: "oklch(38% 0.1 145)", fontFamily: "var(--font-poppins)", margin: "4px 0 0" }}>
                      Taxa de deslocamento: {fmt(travelFee)}
                    </p>
                  )}
                </div>
              )}
              {!cepChecking && cepValid === false && cepError && (
                <div style={{ background: "oklch(96% 0.04 15)", border: "1px solid oklch(85% 0.08 15)", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                  <p style={{ fontSize: 13, color: "oklch(40% 0.12 15)", fontFamily: "var(--font-poppins)", fontWeight: 600, margin: 0 }}>
                    ✗ Fora da área de atendimento
                  </p>
                  <p style={{ fontSize: 12, color: "oklch(48% 0.1 15)", fontFamily: "var(--font-poppins)", margin: "4px 0 0" }}>
                    {cepError}
                  </p>
                </div>
              )}
            </div>

            {cepValid === true && (
              <button
                onClick={() => setStep("date")}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontSize: 15, fontWeight: 600, fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)", cursor: "pointer" }}>
                Escolher data →
              </button>
            )}
          </>
        )}

        {/* ── STEP: date ────────────────────────────── */}
        {step === "date" && selectedSvc && (
          <>
            <button
              onClick={() => location === "home" ? setStep("cep") : (getLocationMode(salon!) === "picker" ? setStep("location") : setStep("list"))}
              style={backBtn}>← Voltar</button>

            <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{selectedSvc.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: 0 }}>{selectedSvc.name}</p>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: "2px 0 0" }}>{selectedSvc.duration_min} min · {fmt(selectedSvc.price)}</p>
              </div>
              <span style={{ fontSize: 12, background: "oklch(97% 0.01 0)", border: "1px solid var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-poppins)", fontWeight: 600, padding: "4px 10px", borderRadius: 8 }}>
                {location === "home" ? "🏠 Em Casa" : "🏪 No Salão"}
              </span>
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
                {travelFee > 0 && <><br /><span style={{ color: "var(--text-mid)", fontSize: 12 }}>+ taxa de deslocamento {fmt(travelFee)}</span></>}
              </p>
            </div>

            {/* Deposit notice */}
            {salon.requires_deposit && (
              <div style={{ background: "oklch(97% 0.04 75)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(90% 0.04 75)", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💳</span>
                <div>
                  <p style={{ fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 13, color: "var(--text)", margin: "0 0 2px" }}>Sinal de 20% necessário</p>
                  <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0 }}>
                    Você será redirecionada para pagar {fmt(selectedSvc.price * 0.2)} via cartão. O restante é pago no dia.
                  </p>
                </div>
              </div>
            )}

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
              {submitting
                ? "Aguarde..."
                : salon.requires_deposit
                  ? `Pagar sinal ${fmt(selectedSvc.price * 0.2)} e confirmar`
                  : "Confirmar agendamento ✓"}
            </button>
          </>
        )}

        {/* ── STEP: done — erro ─────────────────────── */}
        {step === "done" && bookingFailed && (
          <div style={{ textAlign: "center", paddingTop: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, oklch(65% 0.15 15), oklch(50% 0.18 15))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 4px 18px oklch(50% 0.18 15 / 0.3)" }}>
              <span style={{ color: "white", fontSize: 32 }}>✗</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, color: "var(--text)", margin: "0 0 10px" }}>Não foi possível concluir</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", margin: "0 0 32px", lineHeight: 1.6 }}>
              Horário indisponível. Por favor, escolha outro horário.
            </p>
            <button
              onClick={resetBooking}
              style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: "var(--gold)", color: "white", fontFamily: "var(--font-poppins)", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
              Escolher outro horário
            </button>
          </div>
        )}

        {/* ── STEP: done — sucesso ──────────────────── */}
        {step === "done" && !bookingFailed && (
          <div style={{ textAlign: "center", paddingTop: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, oklch(88% 0.055 10), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 4px 18px oklch(72% 0.115 75 / 0.35)" }}>
              <span style={{ color: "white", fontSize: 32 }}>✓</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 26, color: "var(--text)", margin: "0 0 8px" }}>Agendado!</h2>
            <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-light)", margin: "0 0 24px" }}>
              Seu agendamento foi confirmado.
            </p>

            {/* Sinal recebido badge */}
            {paymentDone && (
              <div style={{ background: "oklch(92% 0.06 145)", borderRadius: 10, padding: "12px 16px", border: "1px solid oklch(78% 0.1 145)", marginBottom: 20, display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>💚</span>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: "oklch(32% 0.1 145)", margin: 0 }}>
                  Sinal recebido! Agendamento confirmado.
                </p>
              </div>
            )}

            {/* Booking details */}
            {selectedSvc && selectedDate && selectedTime && (
              <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--border)", marginBottom: 20, textAlign: "left" }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.8 }}>
                  <strong>{selectedSvc.emoji} {selectedSvc.name}</strong><br />
                  <span style={{ color: "var(--text-mid)" }}>
                    {formatDateDisplay(dates.find(d => toISODate(d) === selectedDate) ?? new Date())} às {selectedTime}
                  </span><br />
                  <span style={{ color: "var(--text-mid)" }}>{salon.name}</span>
                  {salon.phone && <><br /><span style={{ color: "var(--text-mid)" }}>📞 {salon.phone}</span></>}
                </p>
              </div>
            )}

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
