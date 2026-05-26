"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function markCommissionPaid(affiliateId: string) {
  const admin = createAdminClient();
  await admin
    .from("referrals")
    .update({ commission_status: "paid" })
    .eq("affiliate_id", affiliateId)
    .eq("commission_status", "pending")
    .not("converted_at", "is", null);

  revalidatePath("/admin/afiliadas");
}
