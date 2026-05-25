export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/zapi";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase env vars missing");
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Subscription lifecycle events ────────────────────────────────────────
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : null;

    if (stripeCustomerId) {
      const validStatuses = ["active", "canceled", "past_due", "trialing"];
      const newStatus = validStatuses.includes(sub.status) ? sub.status : "canceled";
      const rawTs = (sub as unknown as Record<string, unknown>)["current_period_end"];
      const periodEnd = typeof rawTs === "number"
        ? new Date(rawTs * 1000).toISOString()
        : null;

      await supabase
        .from("subscriptions")
        .update({
          status: newStatus,
          stripe_sub_id: sub.id,
          ...(periodEnd ? { current_period_end: periodEnd } : {}),
        })
        .eq("stripe_customer_id", stripeCustomerId);
    }

    return NextResponse.json({ received: true });
  }

  // ── Only process checkout.session.completed from here on ─────────────────
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // ── Subscription checkout ─────────────────────────────────────────────────
  if (session.mode === "subscription") {
    const ownerId = session.metadata?.owner_id;
    const stripeSubId = typeof session.subscription === "string" ? session.subscription : null;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

    if (ownerId && stripeSubId && stripeCustomerId) {
      let periodEnd: string | null = null;
      try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const rawTs = (stripeSub as unknown as Record<string, unknown>)["current_period_end"];
        if (typeof rawTs === "number") {
          periodEnd = new Date(rawTs * 1000).toISOString();
        }
      } catch (err) {
        console.error("Failed to retrieve subscription:", err);
      }

      await supabase.from("subscriptions").upsert(
        {
          owner_id: ownerId,
          status: "active",
          stripe_customer_id: stripeCustomerId,
          stripe_sub_id: stripeSubId,
          ...(periodEnd ? { current_period_end: periodEnd } : {}),
        },
        { onConflict: "owner_id" }
      );
    }

    return NextResponse.json({ received: true });
  }

  // ── Appointment deposit checkout ──────────────────────────────────────────
  const m = session.metadata ?? {};

  // ── Idempotency: skip if session already processed ────────────────────────
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // ── Insert appointment ────────────────────────────────────────────────────
  const travelFee = parseFloat(m.travel_fee || "0") || 0;

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      salon_id: m.salon_id,
      client_id: null,
      client_name: m.client_name,
      client_phone: m.client_phone || null,
      appt_date: m.appt_date,
      appt_time: m.appt_time,
      total_price: travelFee,
      status: "confirmado",
      payment_method: "credito",
      location: m.location === "home" ? "domicilio" : "salao",
      stripe_session_id: session.id,
      client_cep: m.client_cep || null,
      travel_fee: travelFee,
    })
    .select("id")
    .single();

  if (apptError || !appt) {
    console.error("Appointment insert error:", apptError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // ── Insert appointment_item ───────────────────────────────────────────────
  if (m.service_id) {
    const { error: itemError } = await supabase
      .from("appointment_items")
      .insert({
        appointment_id: appt.id,
        service_id: m.service_id,
        service_name: m.service_name,
        price: parseFloat(m.price),
        duration_min: parseInt(m.duration_min, 10) || 60,
        position: 1,
      });

    if (itemError) {
      console.error("Appointment item insert error:", itemError);
      await supabase.from("appointments").delete().eq("id", appt.id);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  } else {
    await supabase
      .from("appointments")
      .update({ total_price: parseFloat(m.price) + travelFee })
      .eq("id", appt.id);
  }

  // ── Insert transaction (sinal recebido) ───────────────────────────────────
  const sinalAmount = parseFloat(m.deposit_amount || String(parseFloat(m.price || "0") * 0.2));
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  await supabase.from("transactions").insert({
    salon_id: m.salon_id,
    appointment_id: appt.id,
    type: "sinal_received",
    amount: sinalAmount,
    stripe_payment_intent_id: paymentIntentId,
    status: "pago",
  });

  // ── WhatsApp notifications ────────────────────────────────────────────────
  const zapiId = process.env.ZAPI_INSTANCE_ID;
  const zapiToken = process.env.ZAPI_TOKEN;
  if (zapiId && zapiToken) {
    const { data: salon } = await supabase
      .from("salons")
      .select("name, phone, address")
      .eq("id", m.salon_id)
      .single();

    const salonName = (salon?.name as string | null) ?? "";
    const salonPhone = (salon?.phone as string | null) ?? "";
    const loc = (salon?.address as string | null) || salonName;
    const clientMsg = `Olá ${m.client_name}! 🎉 Seu agendamento foi confirmado pelo LevBeauty!\n💅 ${m.service_name} com ${salonName}\n📅 ${m.appt_date} às ${m.appt_time}\n📍 ${loc}\nQualquer dúvida entre em contato: ${salonPhone || "—"}`;
    const proMsg = `🔔 Novo agendamento via LevBeauty!\nCliente: ${m.client_name} — ${m.client_phone || "—"}\nServiço: ${m.service_name}\n📅 ${m.appt_date} às ${m.appt_time}`;

    if (m.client_phone) await sendWhatsApp(m.client_phone, clientMsg, zapiId, zapiToken);
    if (salonPhone) await sendWhatsApp(salonPhone, proMsg, zapiId, zapiToken);
  }

  return NextResponse.json({ received: true });
}
