"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ClientInput {
  name: string;
  phone: string;
  birthDate?: string | null;
  cep?: string | null;
  isVip?: boolean;
  isBlocked?: boolean;
}

export interface AnamneseInput {
  allergies?: string | null;
  hasDiabetes: boolean;
  isPregnant: boolean;
  usesContinuousMedication: boolean;
  otherConditions?: string | null;
  preferences?: string | null;
  technicalHistory?: string | null;
  generalNotes?: string | null;
}

async function getAuthedSalonId(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; salonId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", user.id).maybeSingle();
  if (!salon) return null;
  return { supabase, salonId: salon.id as string };
}

export async function addClient(salonId: string, data: ClientInput) {
  const supabase = await createClient();
  const digits = data.phone.replace(/\D/g, "");
  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      salon_id: salonId,
      name: data.name.trim(),
      phone: digits,
      birth_date: data.birthDate || null,
      cep: data.cep?.replace(/\D/g, "") || null,
      is_vip: data.isVip ?? false,
      is_blocked: data.isBlocked ?? false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/painel/clientes");
  return { ok: true, id: created.id as string };
}

export async function updateClient(clientId: string, data: ClientInput) {
  const ctx = await getAuthedSalonId();
  if (!ctx) return { ok: false, error: "Não autorizado" };
  const digits = data.phone.replace(/\D/g, "");
  const { error } = await ctx.supabase
    .from("clients")
    .update({
      name: data.name.trim(),
      phone: digits,
      birth_date: data.birthDate || null,
      cep: data.cep?.replace(/\D/g, "") || null,
      is_vip: data.isVip ?? false,
      is_blocked: data.isBlocked ?? false,
    })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/painel/clientes/${clientId}`);
  revalidatePath("/painel/clientes");
  return { ok: true };
}

export async function saveAnamnese(clientId: string, data: AnamneseInput, isFirstConsent: boolean) {
  const ctx = await getAuthedSalonId();
  if (!ctx) return { ok: false, error: "Não autorizado" };

  const update: Record<string, unknown> = {
    allergies: data.allergies?.trim() || null,
    has_diabetes: data.hasDiabetes,
    is_pregnant: data.isPregnant,
    uses_continuous_medication: data.usesContinuousMedication,
    other_conditions: data.otherConditions?.trim() || null,
    preferences: data.preferences?.trim() || null,
    technical_history: data.technicalHistory?.trim() || null,
    general_notes: data.generalNotes?.trim() || null,
  };

  if (isFirstConsent) {
    update.lgpd_consent_at = new Date().toISOString();
    update.lgpd_consent_version = 1;
  }

  const { error } = await ctx.supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/painel/clientes/${clientId}`);
  return { ok: true };
}

export async function updateClientNotes(clientId: string, notes: string) {
  const ctx = await getAuthedSalonId();
  if (!ctx) return { ok: false };
  const { error } = await ctx.supabase.from("clients").update({ notes: notes.trim() || null }).eq("id", clientId);
  if (error) return { ok: false };
  revalidatePath(`/painel/clientes/${clientId}`);
  return { ok: true };
}

export async function toggleClientVipAction(clientId: string) {
  const ctx = await getAuthedSalonId();
  if (!ctx) return;
  const { data } = await ctx.supabase.from("clients").select("is_vip").eq("id", clientId).single();
  await ctx.supabase.from("clients").update({ is_vip: !data?.is_vip }).eq("id", clientId);
  revalidatePath("/painel/clientes");
  revalidatePath(`/painel/clientes/${clientId}`);
}

export async function toggleClientBlockedAction(clientId: string) {
  const ctx = await getAuthedSalonId();
  if (!ctx) return;
  const { data } = await ctx.supabase.from("clients").select("is_blocked").eq("id", clientId).single();
  await ctx.supabase.from("clients").update({ is_blocked: !data?.is_blocked }).eq("id", clientId);
  revalidatePath("/painel/clientes");
  revalidatePath(`/painel/clientes/${clientId}`);
}
