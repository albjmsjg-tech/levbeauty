export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata ?? {};

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env vars missing");
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.from("appointments").insert({
      salon_id: m.salon_id,
      client_id: null,
      client_name: m.client_name,
      client_phone: m.client_phone || null,
      service_name: m.service_name,
      appt_date: m.appt_date,
      appt_time: m.appt_time,
      duration_min: parseInt(m.duration_min, 10),
      price: parseFloat(m.price),
      status: "confirmado",
      payment_method: "credito",
      location: m.location === "home" ? "domicilio" : "salao",
      deposit_paid: true,
      deposit_amount: parseFloat(m.deposit_amount),
      stripe_session_id: session.id,
      client_cep: m.client_cep || null,
      travel_fee: parseFloat(m.travel_fee) || 0,
    });

    if (error) {
      console.error("Supabase insert error:", error);
    }
  }

  return NextResponse.json({ received: true });
}
