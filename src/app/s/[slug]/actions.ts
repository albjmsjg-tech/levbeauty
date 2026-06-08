'use server';

import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsApp } from "@/lib/zapi";

interface BookParams {
  salonId: string;
  serviceId: string;
  serviceName: string;
  apptDate: string;
  apptTime: string;
  durationMin: number;
  clientName: string;
  clientPhone: string;
  paymentMethod: 'pix' | 'credito' | 'local' | 'dinheiro' | 'outro';
  price: number;
  location: 'salao' | 'domicilio';
  clientCep?: string;
  travelFee?: number;
  salonName: string;
  salonPhone?: string | null;
  salonAddress?: string | null;
  requiresDeposit: boolean;
}

type BookResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

function formatApptDate(iso: string): string {
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${d} de ${MONTHS[m - 1]}`;
}

export async function bookAppointment(params: BookParams): Promise<BookResult> {
  const {
    salonId, serviceId, serviceName, apptDate, apptTime, durationMin,
    clientName, clientPhone, paymentMethod, price, location, clientCep, travelFee,
    salonName, salonPhone, salonAddress, requiresDeposit,
  } = params;

  const admin = createAdminClient();

  // Logged user (nullable — guest bookings are allowed)
  const serverClient = await createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  const profileId = user?.id ?? null;

  // Normalize phone and name
  const phone = clientPhone.replace(/\D/g, '');
  const name = clientName.trim();

  // Lookup existing client for this salon + phone
  const { data: existing } = await admin
    .from('clients')
    .select('id, name, profile_id, is_blocked')
    .eq('salon_id', salonId)
    .eq('phone', phone)
    .maybeSingle();

  let clientId: string;

  if (existing) {
    // Blocked client sees generic message — no details leaked
    if (existing.is_blocked) {
      return { ok: false, error: 'Horário indisponível' };
    }

    // Update name or link profile if needed
    const updates: Record<string, unknown> = {};
    if (existing.name !== name) updates.name = name;
    if (!existing.profile_id && profileId) updates.profile_id = profileId;
    if (Object.keys(updates).length > 0) {
      await admin.from('clients').update(updates).eq('id', existing.id);
    }

    clientId = existing.id as string;
  } else {
    // First booking — create client record
    const { data: newClient, error: clientErr } = await admin
      .from('clients')
      .insert({ salon_id: salonId, phone, name, profile_id: profileId })
      .select('id')
      .single();

    if (clientErr || !newClient) {
      return { ok: false, error: 'Horário indisponível' };
    }
    clientId = newClient.id as string;
  }

  // Insert appointment — service columns moved to appointment_items after 011 refactor
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .insert({
      salon_id: salonId,
      client_id: clientId,
      profile_id: profileId,
      client_name: name,
      client_phone: phone || null,
      appt_date: apptDate,
      appt_time: apptTime,
      status: requiresDeposit ? 'pendente' : 'confirmado',
      payment_method: paymentMethod,
      location,
      client_cep: clientCep || null,
      travel_fee: travelFee ?? 0,
      total_price: 0,
    })
    .select('id')
    .single();

  if (apptErr || !appt) {
    console.error('[bookAppointment] appointment insert error:', apptErr);
    return { ok: false, error: 'Horário indisponível' };
  }

  // Insert the single service item — trigger recalcs total_price automatically
  const { error: itemErr } = await admin
    .from('appointment_items')
    .insert({
      appointment_id: appt.id as string,
      service_id: serviceId,
      service_name: serviceName,
      price,
      duration_min: durationMin,
      position: 1,
    });

  if (itemErr) {
    console.error('[bookAppointment] appointment_items insert error:', itemErr);
    void admin.from('appointments').delete().eq('id', appt.id);
    return { ok: false, error: 'Horário indisponível' };
  }

  // Update last_visit_at (non-blocking)
  void admin.from('clients')
    .update({ last_visit_at: new Date().toISOString() })
    .eq('id', clientId);

  // WhatsApp notifications (fire-and-forget)
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (instanceId && token) {
    const dateLabel = formatApptDate(apptDate);
    const loc = salonAddress || salonName;
    const clientMsg = requiresDeposit
      ? `Olá ${name}! Seu agendamento foi recebido ✨\n` +
        `💅 ${serviceName} com ${salonName}\n` +
        `📅 ${dateLabel} às ${apptTime}\n` +
        `📍 ${loc}\n\n` +
        `Para confirmar, a profissional vai te enviar o link de pagamento do sinal aqui no WhatsApp. Assim que você pagar, o agendamento fica confirmado 💛\n\n` +
        `Qualquer dúvida entre em contato: ${salonPhone || '—'}`
      : `Olá ${name}! 🎉 Seu agendamento foi confirmado pelo LevBeauty!\n` +
        `💅 ${serviceName} com ${salonName}\n` +
        `📅 ${dateLabel} às ${apptTime}\n` +
        `📍 ${loc}\n` +
        `Qualquer dúvida entre em contato: ${salonPhone || '—'}`;
    const proMsg = requiresDeposit
      ? `💰 Novo agendamento pendente de sinal via LevBeauty!\n` +
        `Cliente: ${name} — ${phone}\n` +
        `Serviço: ${serviceName}\n` +
        `📅 ${dateLabel} às ${apptTime}\n\n` +
        `⚠️ Envie o link de pagamento do sinal para confirmar.`
      : `🔔 Novo agendamento via LevBeauty!\n` +
        `Cliente: ${name} — ${phone}\n` +
        `Serviço: ${serviceName}\n` +
        `📅 ${dateLabel} às ${apptTime}`;

    if (phone) waitUntil(sendWhatsApp(phone, clientMsg, instanceId, token).catch(console.error));
    if (salonPhone) waitUntil(sendWhatsApp(salonPhone, proMsg, instanceId, token).catch(console.error));
  }

  return { ok: true, appointmentId: appt.id as string };
}
