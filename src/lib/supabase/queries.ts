import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, AppointmentItem, FixedCost, Input, Service } from "@/types";

type DbRow = Record<string, unknown>;

// ── Type mappers (DB ↔ local) ─────────────────────────────────────────────────

export function mapDbAppt(row: DbRow): Appointment {
  const rawItems = Array.isArray(row.appointment_items) ? (row.appointment_items as DbRow[]) : [];
  const items: AppointmentItem[] = rawItems
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(item => ({
      id: item.id as string,
      serviceId: item.service_id as string,
      serviceName: item.service_name as string,
      price: Number(item.price),
      durationMin: Number(item.duration_min),
      position: Number(item.position),
    }));
  return {
    id: row.id as string,
    clientId: (row.client_id as string) ?? undefined,
    name: row.client_name as string,
    phone: (row.client_phone as string) ?? "",
    date: (row.appt_date as string) ?? undefined,
    time: row.appt_time as string,
    status: (row.status === "concluido" ? "concluído" : row.status) as Appointment["status"],
    totalPrice: Number(row.total_price ?? 0),
    travelFee: Number(row.travel_fee ?? 0),
    clientCep: (row.client_cep as string) ?? undefined,
    location: (row.location === "domicilio" ? "home" : "salon") as Appointment["location"],
    payment: (row.payment_method === "credito" ? "credit" : (row.payment_method ?? "pix")) as Appointment["payment"],
    notes: (row.notes as string) ?? undefined,
    items,
  };
}

export function mapDbCost(row: DbRow): FixedCost {
  return {
    id: row.id as string,
    name: row.name as string,
    val: Number(row.amount),
  };
}

export function mapDbService(row: DbRow): Service {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? "",
    duration: (row.duration as string) ?? "",
    price: Number(row.price),
    active: Boolean(row.active),
    desc: (row.description as string) ?? undefined,
    inputs: Array.isArray(row.inputs) ? (row.inputs as string[]) : [],
  };
}

export function mapDbInput(row: DbRow): Input {
  return {
    id: row.id as string,
    name: row.name as string,
    unit: (row.unit as string) ?? "un",
    pkgQty: Number(row.pkg_qty),
    pkgCost: Number(row.pkg_cost),
    perApplication: Number(row.per_application),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getOwnerSalon(supabase: SupabaseClient): Promise<DbRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("salons")
    .select("id, name, slug, phone, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  return data as DbRow | null;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const PT_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function getWeekDates(weekOffset: number = 0): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function weekDayLabel(d: Date): string {
  return `${PT_DAYS[d.getDay()]} ${d.getDate()}`;
}

export function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
