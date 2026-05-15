"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { PricingConfig } from "@/types";
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
    .select("profit_margin, tax_pct, card_pct, fixed_cost_pct")
    .eq("salon_id", salon.id)
    .maybeSingle();

  if (!data) return DEFAULT_PRICING_CONFIG;
  return {
    profitMargin: Number(data.profit_margin),
    taxPct: Number(data.tax_pct),
    cardPct: Number(data.card_pct),
    fixedCostPct: Number(data.fixed_cost_pct),
  };
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
        profit_margin: config.profitMargin,
        tax_pct: config.taxPct,
        card_pct: config.cardPct,
        fixed_cost_pct: config.fixedCostPct,
      },
      { onConflict: "salon_id" },
    );
  if (error) return { error: error.message };
  return {};
}
