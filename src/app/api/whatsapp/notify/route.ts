import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/zapi";

export async function POST(req: NextRequest) {
  const { salonId, phone, message } = await req.json() as {
    salonId: string;
    phone: string;
    message: string;
  };

  if (!salonId || !phone || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = createClient(url, key);
  const { data: salon } = await supabase
    .from("salons")
    .select("zapi_instance_id, zapi_token, zapi_connected")
    .eq("id", salonId)
    .single();

  if (!salon?.zapi_connected || !salon.zapi_instance_id || !salon.zapi_token) {
    return NextResponse.json({ skipped: true });
  }

  const result = await sendWhatsApp(
    phone,
    message,
    salon.zapi_instance_id as string,
    salon.zapi_token as string
  );
  return NextResponse.json(result);
}
