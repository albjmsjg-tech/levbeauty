"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function findUniqueSlug(admin: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  let slug = base;
  for (let i = 1; i <= 20; i++) {
    const { data } = await admin.from("affiliates").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function signUpOwner(formData: FormData) {
  const email      = formData.get("email") as string;
  const password   = formData.get("password") as string;
  const fullName   = formData.get("name") as string;
  const couponCode = ((formData.get("coupon") as string) ?? "").trim().toUpperCase();
  const refSlug    = ((formData.get("ref") as string) ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "Preencha todos os campos." };
  }

  const admin = createAdminClient();

  // Validate coupon if provided
  type CouponRow = { type: string; benefit: string; value: number; active: boolean };
  let coupon: CouponRow | null = null;
  if (couponCode) {
    const { data } = await admin
      .from("coupons")
      .select("type, benefit, value, active")
      .eq("code", couponCode)
      .maybeSingle();
    if (!data || !data.active) return { error: "Cupom inválido ou expirado." };
    coupon = data as CouponRow;
  }

  // Create user — role in user_metadata so the DB trigger sets profile correctly
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "owner" },
    user_metadata: { full_name: fullName, role: "owner" },
  });
  if (createError) return { error: createError.message };
  const userId = userData.user.id;

  // Sign in
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "Conta criada. Faça login para continuar." };

  // Ensure subscription exists (fallback in case trigger didn't fire)
  await admin.from("subscriptions").upsert(
    { owner_id: userId, plan: "pro", status: "trialing",
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
    { onConflict: "owner_id" }
  );

  // Apply coupon
  if (coupon) {
    if (couponCode === "EMBLEV6") {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      await admin.from("subscriptions").upsert(
        { owner_id: userId, plan: "pro", status: "trialing",
          current_period_end: sixMonthsFromNow.toISOString() },
        { onConflict: "owner_id" }
      );

      const slug = await findUniqueSlug(admin, generateSlug(fullName));
      await admin.from("affiliates").insert({
        owner_id: userId,
        slug,
        type: "ambassador",
        status: "active",
        contract_end: sixMonthsFromNow.toISOString(),
      });
    }
    // LVB50 / LVB100 → redirect to /assinar with coupon for Stripe discount at checkout
  }

  // Track referral
  if (refSlug) {
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("id")
      .eq("slug", refSlug)
      .eq("status", "active")
      .maybeSingle();
    if (affiliate) {
      await admin.from("referrals").insert({
        affiliate_id: affiliate.id,
        referred_owner_id: userId,
      });
    }
  }

  revalidatePath("/", "layout");

  if (couponCode === "LVB50" || couponCode === "LVB100") {
    redirect(`/assinar?coupon=${couponCode}`);
  }
  redirect("/onboarding");
}
