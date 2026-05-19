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
  salon_slot_interval_min: number;
  home_visit_interval_min: number;
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

// Gera slots a cada 30 min entre opens_at e closes_at, apenas onde o serviço cabe
function generateSlots(opensAt: string, closesAt: string, svcDuration: number): string[] {
  const opens = toMinutes(opensAt);
  const closes = toMinutes(closesAt);
  const slots: string[] = [];
  for (let t = opens; t + svcDuration <= closes; t += 30) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

function isAvailable(
  slot: string,
  svcDuration: number,
  intervalMin: number,
  booked: { appt_time: string; duration_min: number }[],
  partialBlocks: { startTime: string; endTime: string }[],
): boolean {
  const slotStart = toMinutes(slot);
  const slotEnd = slotStart + svcDuration;
  for (const b of booked) {
    const bStart = toMinutes(b.appt_time);
    const bEnd = bStart + b.duration_min + intervalMin;
    if (slotStart < bEnd && slotEnd > bStart) return false;
  }
  for (const p of partialBlocks) {
    const pStart = toMinutes(p.startTime);
    const pEnd = toMinutes(p.endTime);
    if (slotStart < pEnd && slotEnd > pStart) return false;
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
  const [salonHours, setSalonHours] = useState<Record<number, { isOpen: boolean; opensAt: string | null; closesAt: string | null }>>({});
  type BlockEntry = { startTime: string | null; endTime: string | null; reason: string | null };
  const [blocksMap, setBlocksMap] = useState<Record<string, BlockEntry[]>>({});
  const [salonIntervalMin, setSalonIntervalMin] = useState(30);
  const [homeIntervalMin, setHomeIntervalMin] = useState(120);
  const [partialBlocks, setPartialBlocks] = useState<{ startTime: string; endTime: string }[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

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
        .select("id, name, slug, phone, address, home_enabled, home_salon, requires_deposit, cep_base, max_radius_km, price_per_km, min_travel_fee, salon_slot_interval_min, home_visit_interval_min")
        .eq("slug", params.slug)
        .single();

      if (salonErr || !salonData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const sd = salonData as SalonData;
      setSalon(sd);
      setSalonIntervalMin(sd.salon_slot_interval_min ?? 30);
      setHomeIntervalMin(sd.home_visit_interval_min ?? 120);

      const todayStr = toISODate(new Date());
      const in90 = new Date();
      in90.setDate(in90.getDate() + 90);
      const in90Str = toISODate(in90);

      const [svcResult, hoursResult, blockedResult] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, emoji, duration_min, price")
          .eq("salon_id", sd.id)
          .eq("active", true)
          .order("name"),
        supabase
          .from("salon_hours")
          .select("day_of_week, is_open, opens_at, closes_at")
          .eq("salon_id", sd.id),
        supabase
          .from("salon_blocks")
          .select("block_date, start_time, end_time, reason")
          .eq("salon_id", sd.id)
          .gte("block_date", todayStr)
          .lte("block_date", in90Str),
      ]);

      setServices((svcResult.data ?? []) as ServiceData[]);

      const hoursMap: Record<number, { isOpen: boolean; opensAt: string | null; closesAt: string | null }> = {};
      (hoursResult.data ?? []).forEach(row => {
        hoursMap[row.day_of_week as number] = {
          isOpen: row.is_open as boolean,
          opensAt: row.opens_at ? String(row.opens_at).slice(0, 5) : null,
          closesAt: row.closes_at ? String(row.closes_at).slice(0, 5) : null,
        };
      });
      setSalonHours(hoursMap);

      const bMap: Record<string, { startTime: string | null; endTime: string | null; reason: string | null }[]> = {};
      for (const row of (blockedResult.data ?? [])) {
        const ds = row.block_date as string;
        if (!bMap[ds]) bMap[ds] = [];
        bMap[ds].push({
          startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
          endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
          reason: (row.reason as string | null) ?? null,
        });
      }
      setBlocksMap(bMap);
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
    setAvailableSlots([]);

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

    const [y, m, d] = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const hourConfig = salonHours[dayOfWeek];
    const opensAt = hourConfig?.opensAt ?? "08:00";
    const closesAt = hourConfig?.closesAt ?? "19:00";

    const dateBlocks = blocksMap[dateStr] ?? [];
    const partial = dateBlocks.filter(
      (b): b is { startTime: string; endTime: string; reason: string | null } =>
        b.startTime !== null && b.endTime !== null,
    );
    setPartialBlocks(partial.map(b => ({ startTime: b.startTime, endTime: b.endTime })));

    setAvailableSlots(generateSlots(opensAt, closesAt, selectedSvc.duration_min));

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
            service_id: selectedSvc.id,
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
    setAvailableSlots([]);
    setPartialBlocks([]);
  };

  // ── availability ────────────────────────────────────
  const unavailableDates = new Set(
    dates
      .filter(d => {
        const ds = toISODate(d);
        const h = salonHours[d.getDay()];
        const hasFullDayBlock = (blocksMap[ds] ?? []).some(b => b.startTime === null);
        return !(h ? h.isOpen : true) || hasFullDayBlock;
      })
      .map(d => toISODate(d))
  );

  const allNext90Unavailable = (() => {
    for (let i = 0; i < 90; i++) {
      const check = new Date();
      check.setDate(check.getDate() + i);
      const ds = toISODate(check);
      const h = salonHours[check.getDay()];
      const isOpen = h ? h.isOpen : true;
      const hasFullDayBlock = (blocksMap[ds] ?? []).some(b => b.startTime === null);
      if (isOpen && !hasFullDayBlock) return false;
    }
    return true;
  })();

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
            {allNext90Unavailable ? (
              <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14, lineHeight: 1.6 }}>
                Sem horários disponíveis no momento. Volte em breve!
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {dates.map(d => {
                  const dateStr = toISODate(d);
                  const isToday = toISODate(new Date()) === dateStr;
                  const isSelected = selectedDate === dateStr;
                  const isUnavailable = unavailableDates.has(dateStr);
                  return (
                    <button key={dateStr}
                      onClick={() => !isUnavailable && handlePickDate(dateStr)}
                      disabled={isUnavailable}
                      style={{
                        padding: "12px 6px",
                        borderRadius: 10,
                        border: `1.5px solid ${isSelected ? "var(--gold)" : isUnavailable ? "oklch(93% 0.003 0)" : "var(--border)"}`,
                        background: isSelected ? "oklch(97% 0.04 75)" : "white",
                        cursor: isUnavailable ? "not-allowed" : "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        transition: "all 0.15s",
                        opacity: isUnavailable ? 0.4 : 1,
                      }}>
                      <span style={{ fontFamily: "var(--font-poppins)", fontSize: 10, color: isSelected ? "var(--gold)" : "var(--text-light)", fontWeight: 500 }}>{DAYS_PT[d.getDay()]}</span>
                      <span style={{ fontFamily: "var(--font-poppins)", fontSize: 20, fontWeight: 700, color: isSelected ? "var(--gold)" : "var(--text)", lineHeight: 1.2 }}>{d.getDate()}</span>
                      <span style={{ fontFamily: "var(--font-poppins)", fontSize: 10, color: isSelected ? "var(--gold)" : "var(--text-light)" }}>{MONTHS_PT[d.getMonth()]}</span>
                      {isToday && !isUnavailable && <span style={{ fontFamily: "var(--font-poppins)", fontSize: 9, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.03em" }}>HOJE</span>}
                    </button>
                  );
                })}
              </div>
            )}
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
            ) : availableSlots.length === 0 ? (
              <div style={{ background: "oklch(96% 0.015 30)", borderRadius: 12, padding: "20px 18px", border: "1px solid oklch(88% 0.03 30)", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 14, color: "var(--text-mid)", margin: 0 }}>
                  Nenhum horário disponível para este serviço nesta data.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {availableSlots.map(slot => {
                  const activeIntervalMin = location === "home" ? homeIntervalMin : salonIntervalMin;
                  const available = isAvailable(slot, selectedSvc.duration_min, activeIntervalMin, bookedSlots, partialBlocks);
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
