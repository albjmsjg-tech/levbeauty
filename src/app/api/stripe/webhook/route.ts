import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 500 });
  }

  const stripeLib = (await import("stripe")).default;
  const stripe = new stripeLib(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Assinatura do webhook inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // TODO: salvar assinatura no Supabase
      break;
    }
    case "customer.subscription.deleted": {
      // TODO: desativar salão no Supabase
      break;
    }
  }

  return NextResponse.json({ received: true });
}
