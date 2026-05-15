"use server";

import { createClient } from "@/lib/supabase/server";
import { getOwnerSalon } from "@/lib/supabase/queries";
import type { Service, Input, PricingConfig } from "@/types";
import { DEFAULT_PRICING_CONFIG } from "@/types";

function parseDuration(str: string): number {
  const h = str.match(/(\d+)h/);
  const m = str.match(/(\d+)\s*min/);
  const total = (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
  return total || 60;
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

type Row = Record<string, unknown>;

function mapDbService(row: Row): Service {
  const inputIds = ((row.service_inputs ?? []) as { input_id: string }[]).map(si => si.input_id);
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? "💅",
    duration: formatDuration(Number(row.duration_min ?? 60)),
    price: Number(row.price),
    active: Boolean(row.active),
    inputs: inputIds,
  };
}

function mapDbInput(row: Row): Input {
  return {
    id: row.id as string,
    name: row.name as string,
    unit: row.unit as string,
    pkgQty: Number(row.pkg_qty),
    pkgCost: Number(row.pkg_cost),
    perApplication: Number(row.per_application),
  };
}

function mapDbPricingConfig(row: Row): PricingConfig {
  return {
    taxPct: Number(row.tax_pct),
    cardPct: Number(row.card_pct),
    fixedCostPct: Number(row.fixed_cost_pct),
  };
}

export async function getPrecificacaoData(): Promise<{
  services: Service[];
  inputs: Input[];
  pricingConfig: PricingConfig;
  salonId: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const salon = await getOwnerSalon(supabase);
  if (!salon) {
    return { services: [], inputs: [], pricingConfig: DEFAULT_PRICING_CONFIG, salonId: null, error: "Salão não encontrado. Complete o onboarding primeiro." };
  }

  const salonId = salon.id as string;

  const [
    { data: svcRows, error: svcErr },
    { data: inputRows, error: inpErr },
    { data: pcRow },
  ] = await Promise.all([
    supabase.from("services").select("*, service_inputs(input_id)").eq("salon_id", salonId).order("created_at"),
    supabase.from("inputs").select("*").eq("salon_id", salonId).order("name"),
    supabase.from("pricing_config").select("tax_pct, card_pct, fixed_cost_pct").eq("salon_id", salonId).maybeSingle(),
  ]);

  if (svcErr) return { services: [], inputs: [], pricingConfig: DEFAULT_PRICING_CONFIG, salonId, error: svcErr.message };
  if (inpErr) return { services: [], inputs: [], pricingConfig: DEFAULT_PRICING_CONFIG, salonId, error: inpErr.message };

  return {
    services: (svcRows ?? []).map(r => mapDbService(r as Row)),
    inputs: (inputRows ?? []).map(r => mapDbInput(r as Row)),
    pricingConfig: pcRow ? mapDbPricingConfig(pcRow as Row) : DEFAULT_PRICING_CONFIG,
    salonId,
  };
}

export async function upsertService(
  draft: Service,
  salonId: string,
): Promise<{ id: string; error?: string }> {
  const supabase = await createClient();

  const payload = {
    salon_id: salonId,
    name: draft.name.trim(),
    emoji: draft.emoji || "💅",
    duration_min: parseDuration(draft.duration),
    price: draft.price,
    active: draft.active,
  };

  const isNew = typeof draft.id === "number";
  let serviceId: string;

  if (isNew) {
    const { data, error } = await supabase.from("services").insert(payload).select("id").single();
    if (error || !data) return { id: "", error: error?.message ?? "Erro ao criar serviço." };
    serviceId = (data as Row).id as string;
  } else {
    const { error } = await supabase.from("services").update(payload).eq("id", draft.id as string);
    if (error) return { id: "", error: error.message };
    serviceId = draft.id as string;
  }

  await supabase.from("service_inputs").delete().eq("service_id", serviceId);
  if (draft.inputs.length > 0) {
    const { error: piErr } = await supabase.from("service_inputs").insert(
      draft.inputs.map(inputId => ({ service_id: serviceId, input_id: inputId }))
    );
    if (piErr) return { id: serviceId, error: piErr.message };
  }

  return { id: serviceId };
}

export async function updateServicePrice(
  serviceId: string,
  price: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ price }).eq("id", serviceId);
  if (error) return { error: error.message };
  return {};
}

export async function removeService(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
