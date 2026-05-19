"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ComandaItemInput {
  serviceId: string;
  serviceName: string;
  price: number;
  durationMin: number;
  position: number;
}

export interface ComandaInput {
  salonId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  items: ComandaItemInput[];
  location: "salao" | "domicilio";
  clientCep?: string;
  travelFee?: number;
  paymentMethod: string;
  notes?: string;
  status: string;
}

async function upsertClient(supabase: Awaited<ReturnType<typeof createClient>>, salonId: string, name: string, phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("salon_id", salonId)
    .eq("phone", digits)
    .maybeSingle();

  if (existing) {
    await supabase.from("clients").update({ name }).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created } = await supabase
    .from("clients")
    .insert({ salon_id: salonId, name, phone: digits })
    .select("id")
    .single();

  return (created?.id as string) ?? null;
}

export async function createComanda(input: ComandaInput) {
  const supabase = await createClient();

  const clientId = await upsertClient(supabase, input.salonId, input.clientName, input.clientPhone);
  if (!clientId) return { ok: false, error: "Telefone obrigatório para cadastrar cliente." };

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      salon_id: input.salonId,
      client_id: clientId,
      client_name: input.clientName,
      client_phone: input.clientPhone.replace(/\D/g, "") || null,
      appt_date: input.date,
      appt_time: input.time,
      location: input.location,
      client_cep: input.clientCep ?? null,
      travel_fee: input.travelFee ?? 0,
      payment_method: input.paymentMethod,
      notes: input.notes ?? null,
      status: input.status,
    })
    .select("id")
    .single();

  if (apptErr || !appt) return { ok: false, error: apptErr?.message };

  if (input.items.length > 0) {
    const { error: itemsErr } = await supabase.from("appointment_items").insert(
      input.items.map(item => ({
        appointment_id: appt.id,
        service_id: item.serviceId,
        service_name: item.serviceName,
        price: item.price,
        duration_min: item.durationMin,
        position: item.position,
      }))
    );
    if (itemsErr) return { ok: false, error: itemsErr.message };
  }

  revalidatePath("/painel/agenda");
  return { ok: true, appointmentId: appt.id as string };
}

export async function updateComanda(appointmentId: string, input: ComandaInput) {
  const supabase = await createClient();

  const clientId = await upsertClient(supabase, input.salonId, input.clientName, input.clientPhone);
  if (!clientId) return { ok: false, error: "Telefone obrigatório para cadastrar cliente." };

  const { error: apptErr } = await supabase
    .from("appointments")
    .update({
      client_id: clientId,
      client_name: input.clientName,
      client_phone: input.clientPhone.replace(/\D/g, "") || null,
      appt_date: input.date,
      appt_time: input.time,
      location: input.location,
      client_cep: input.clientCep ?? null,
      travel_fee: input.travelFee ?? 0,
      payment_method: input.paymentMethod,
      notes: input.notes ?? null,
      status: input.status,
    })
    .eq("id", appointmentId);

  if (apptErr) return { ok: false, error: apptErr.message };

  await supabase.from("appointment_items").delete().eq("appointment_id", appointmentId);

  if (input.items.length > 0) {
    const { error: itemsErr } = await supabase.from("appointment_items").insert(
      input.items.map(item => ({
        appointment_id: appointmentId,
        service_id: item.serviceId,
        service_name: item.serviceName,
        price: item.price,
        duration_min: item.durationMin,
        position: item.position,
      }))
    );
    if (itemsErr) return { ok: false, error: itemsErr.message };
  }

  revalidatePath("/painel/agenda");
  return { ok: true };
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/painel/agenda");
  return { ok: true };
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient();
  const dbStatus = status === "concluído" ? "concluido" : status;
  const { error } = await supabase.from("appointments").update({ status: dbStatus }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/painel/agenda");
  return { ok: true };
}

export async function toggleClientVip(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("is_vip").eq("id", clientId).single();
  if (error || !data) return { ok: false };
  const { error: updErr } = await supabase.from("clients").update({ is_vip: !data.is_vip }).eq("id", clientId);
  return { ok: !updErr };
}

export async function toggleClientBlocked(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("is_blocked").eq("id", clientId).single();
  if (error || !data) return { ok: false };
  const { error: updErr } = await supabase.from("clients").update({ is_blocked: !data.is_blocked }).eq("id", clientId);
  return { ok: !updErr };
}
