"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error: string } | { success: true };

export async function signUpOwner(
  email: string,
  password: string,
  fullName: string
): Promise<Result> {
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "owner" },
    user_metadata: { full_name: fullName },
  });

  if (error) return { error: error.message };
  return { success: true };
}
