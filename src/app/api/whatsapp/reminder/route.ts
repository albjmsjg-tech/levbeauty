import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/zapi";

export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_REMINDER_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) {
    return NextResponse.json({ error: "ZAPI not configured" }, { status: 503 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = createClient(url, key);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appts } = await supabase
    .from("appointments")
    .select("client_name, client_phone, service_name, appt_time, salons!inner(name)")
    .eq("appt_date", tomorrowStr)
    .not("status", "in", "(cancelado,concluido)")
    .not("client_phone", "is", null);

  let sent = 0;
  for (const appt of appts ?? []) {
    const salonName = (appt.salons as { name: string }).name;
    const time = String(appt.appt_time).slice(0, 5);
    const msg = `Oi ${appt.client_name}! 💅 Lembrando que amanhã você tem ${appt.service_name} com ${salonName} às ${time}.\nTe esperamos! 🌸`;

    const { ok } = await sendWhatsApp(appt.client_phone as string, msg, instanceId, token);
    if (ok) sent++;
  }

  return NextResponse.json({ sent, date: tomorrowStr });
}
