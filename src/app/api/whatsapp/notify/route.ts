import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/zapi";

export async function POST(req: NextRequest) {
  const { phone, message } = await req.json() as { phone: string; message: string };

  if (!phone || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    return NextResponse.json({ skipped: true });
  }

  const result = await sendWhatsApp(phone, message, instanceId, token);
  return NextResponse.json(result);
}
