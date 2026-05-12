"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveSalon(input: {
  name: string;
  phone: string | null;
  address: string | null;
  cep_base: string | null;
  slug: string;
}): Promise<{ id: string; slug: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { id: "", slug: "", error: "Sessão expirada. Faça login novamente." };

  // Ensure profile row exists — trigger may not have run yet for new signups.
  // Ignore errors: if trigger already created it the upsert is a no-op;
  // if INSERT policy is missing the row was already created by the trigger.
  try {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, role: "owner", full_name: user.user_metadata?.full_name ?? "" }, { onConflict: "id" });
  } catch {
    // non-fatal: trigger may have already created the profile
  }

  const { data, error } = await supabase
    .from("salons")
    .insert({ owner_id: user.id, ...input })
    .select("id, slug")
    .single();

  if (error) return { id: "", slug: "", error: error.message };
  return { id: (data as { id: string; slug: string }).id, slug: (data as { id: string; slug: string }).slug };
}

export async function saveServices(
  salonId: string,
  rows: { name: string; emoji: string; duration_min: number; price: number; active: boolean }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert(
    rows.map(r => ({ salon_id: salonId, ...r }))
  );
  if (error) return { error: error.message };
  return {};
}
