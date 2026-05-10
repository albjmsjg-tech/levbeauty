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
