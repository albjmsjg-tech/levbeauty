import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/zapi";

export async function POST(req: NextRequest) {
  const { phone, message } = await req.json() as { phone: string; message: string };

  console.log("[notify] called | phone:", phone, "| msg length:", message?.length);

  if (!phone || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  console.log("[notify] ZAPI_INSTANCE_ID set:", !!instanceId, "| ZAPI_TOKEN set:", !!token);

  if (!instanceId || !token) {
    console.warn("[notify] skipped — env vars not configured");
    return NextResponse.json({ skipped: true });
  }

  const result = await sendWhatsApp(phone, message, instanceId, token);
  console.log("[notify] result:", result);
  return NextResponse.json(result);
}
