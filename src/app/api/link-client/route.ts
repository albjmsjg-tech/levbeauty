import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TODO: Camada 3 atual permite phone-squatting (logado pode reivindicar clients
// órfãos com telefone arbitrário). Aceitável na fase de lançamento.
// Revisar com verificação por SMS quando houver demanda real.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { phone } = await req.json() as { phone?: string };
    const cleanPhone = (phone ?? "").replace(/\D/g, "");
    if (!cleanPhone) return NextResponse.json({ ok: false });

    const admin = createAdminClient();
    await admin
      .from("clients")
      .update({ profile_id: user.id })
      .eq("phone", cleanPhone)
      .is("profile_id", null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
