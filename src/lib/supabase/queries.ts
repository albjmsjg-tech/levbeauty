import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, FixedCost } from "@/types";

type DbRow = Record<string, unknown>;

// ── Type mappers (DB ↔ local) ─────────────────────────────────────────────────

export function mapDbAppt(row: DbRow): Appointment {
  return {
    id: row.id as string,
    name: row.client_name as string,
    svc: row.service_name as string,
    time: row.appt_time as string,
    status: (row.status === "concluido" ? "concluído" : row.status) as Appointment["status"],
    price: Number(row.price),
    phone: (row.client_phone as string) ?? "",
    location: (row.location === "domicilio" ? "home" : "salon") as Appointment["location"],
    payment: (row.payment_method === "credito" ? "credit" : (row.payment_method ?? "pix")) as Appointment["payment"],
  };
}

export function apptToDbRow(a: Appointment, salonId: string, date: string) {
  return {
    salon_id: salonId,
    client_name: a.name,
    client_phone: a.phone || null,
    service_name: a.svc,
    appt_date: date,
    appt_time: a.time,
    duration_min: 60,
    price: a.price,
    status: a.status === "concluído" ? "concluido" : a.status,
    payment_method: a.payment === "credit" ? "credito" : a.payment,
    location: a.location === "home" ? "domicilio" : "salao",
  };
}

export function mapDbCost(row: DbRow): FixedCost {
  return {
    id: row.id as string,
    name: row.name as string,
    val: Number(row.amount),
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
    .single();
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
