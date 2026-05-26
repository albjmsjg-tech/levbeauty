import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!affiliate) return NextResponse.json({ affiliate: null, stats: null });

  const { data: referrals } = await admin
    .from("referrals")
    .select("converted_at, commission_status, commission_amount")
    .eq("affiliate_id", affiliate.id);

  const rows = referrals ?? [];
  const total     = rows.length;
  const converted = rows.filter(r => r.converted_at !== null).length;
  const pending   = rows
    .filter(r => r.converted_at !== null && r.commission_status === "pending")
    .reduce((s, r) => s + Number(r.commission_amount), 0);

  return NextResponse.json({ affiliate, stats: { total, converted, pending } });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("affiliates")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Já é afiliada" }, { status: 409 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = (profile?.full_name as string | null) || "afiliada";
  const base = generateSlug(fullName) || "afiliada";

  let slug = base;
  for (let i = 1; i <= 20; i++) {
    const { data: taken } = await admin.from("affiliates").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${base}-${i}`;
  }

  const { data: affiliate, error } = await admin
    .from("affiliates")
    .insert({ owner_id: user.id, slug, type: "affiliate", status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ affiliate }, { status: 201 });
}
