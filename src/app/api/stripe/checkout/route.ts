import { NextRequest, NextResponse } from "next/server";

const planPriceIds: Record<string, string> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
  premium: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "",
  elite: process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID || "",
};

export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json();
    const priceId = planPriceIds[planId];

    if (!priceId) {
      return NextResponse.json({ error: "Plano inválido ou price_id não configurado." }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe não configurado. Adicione STRIPE_SECRET_KEY ao .env.local" }, { status: 500 });
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/painel/dashboard?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
