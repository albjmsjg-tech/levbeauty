import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });

  let body: {
    salon_id: string;
    service_id: string;
    service_name: string;
    duration_min: number;
    price: number;
    client_name: string;
    client_phone: string;
    appt_date: string;
    appt_time: string;
    location: string;
    slug: string;
    client_cep?: string;
    travel_fee?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { salon_id, service_id, service_name, duration_min, price, client_name, client_phone, appt_date, appt_time, location, slug, client_cep, travel_fee } = body;

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const depositAmount = Math.round(price * 0.2 * 100); // cents

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "pix"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Sinal 20% — ${service_name}`,
            },
            unit_amount: depositAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/s/${slug}?payment_done=1`,
      cancel_url: `${origin}/s/${slug}`,
      metadata: {
        salon_id,
        service_id,
        service_name,
        duration_min: String(duration_min),
        price: String(price),
        client_name,
        client_phone,
        appt_date,
        appt_time,
        location,
        slug,
        deposit_amount: String(price * 0.2),
        client_cep: client_cep ?? "",
        travel_fee: String(travel_fee ?? 0),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
