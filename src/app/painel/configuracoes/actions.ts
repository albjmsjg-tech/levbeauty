"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { PricingConfig, SalonHour, BlockedDate } from "@/types";
import { DEFAULT_PRICING_CONFIG } from "@/types";

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PRICING_CONFIG;

  const { data: salon } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!salon) return DEFAULT_PRICING_CONFIG;

  const { data } = await supabase
    .from("pricing_config")
    .select("tax_pct, card_pct, fixed_cost_pct")
    .eq("salon_id", salon.id)
    .maybeSingle();

  if (!data) return DEFAULT_PRICING_CONFIG;
  return {
    taxPct: Number(data.tax_pct),
    cardPct: Number(data.card_pct),
    fixedCostPct: Number(data.fixed_cost_pct),
  };
}

export async function getSalonHours(salonId: string): Promise<SalonHour[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("salon_hours")
    .select("id, day_of_week, is_open, opens_at, closes_at")
    .eq("salon_id", salonId)
    .order("day_of_week");
  return (data ?? []).map(row => ({
    id: row.id as string,
    dayOfWeek: row.day_of_week as number,
    isOpen: row.is_open as boolean,
    opensAt: row.opens_at ? String(row.opens_at).slice(0, 5) : null,
    closesAt: row.closes_at ? String(row.closes_at).slice(0, 5) : null,
  }));
}

export async function saveSalonHours(
  salonId: string,
  hours: Array<{ dayOfWeek: number; isOpen: boolean; opensAt: string | null; closesAt: string | null }>,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("salon_hours")
    .upsert(
      hours.map(h => ({
        salon_id: salonId,
        day_of_week: h.dayOfWeek,
        is_open: h.isOpen,
        opens_at: h.isOpen ? h.opensAt : null,
        closes_at: h.isOpen ? h.closesAt : null,
      })),
      { onConflict: "salon_id,day_of_week" },
    );
  if (error) return { error: error.message };
  return {};
}

export async function saveSalonInterval(
  salonId: string,
  intervalMin: number,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("salons")
    .update({ slot_interval_min: intervalMin })
    .eq("id", salonId);
  if (error) return { error: error.message };
  return {};
}

export async function getBlockedDates(salonId: string): Promise<BlockedDate[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("salon_blocked_dates")
    .select("id, date, reason")
    .eq("salon_id", salonId)
    .gte("date", today)
    .order("date");
  return (data ?? []).map(row => ({
    id: row.id as string,
    date: row.date as string,
    reason: (row.reason as string | null) ?? null,
  }));
}

export async function addBlockedDate(
  salonId: string,
  date: string,
  reason: string | null,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("salon_blocked_dates")
    .insert({ salon_id: salonId, date, reason: reason || null });
  if (error) {
    if (error.code === "23505") return { error: "Esta data já está bloqueada." };
    return { error: error.message };
  }
  return {};
}

export async function removeBlockedDate(blockedDateId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("salon_blocked_dates")
    .delete()
    .eq("id", blockedDateId);
  if (error) return { error: error.message };
  return {};
}

export async function savePricingConfig(
  salonId: string,
  config: PricingConfig,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("pricing_config")
    .upsert(
      {
        salon_id: salonId,
        tax_pct: config.taxPct,
        card_pct: config.cardPct,
        fixed_cost_pct: config.fixedCostPct,
      },
      { onConflict: "salon_id" },
    );
  if (error) return { error: error.message };
  return {};
}
