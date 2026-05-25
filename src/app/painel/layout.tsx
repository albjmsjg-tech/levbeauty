import { Sidebar } from "@/components/owner/Sidebar";
import { MobileNav } from "@/components/owner/MobileNav";
import { TrialBanner } from "@/components/owner/TrialBanner";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  let trialDaysLeft: number | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Busca o owner_id pelo salão do usuário logado
      const { data: salon } = await supabase
        .from("salons")
        .select("owner_id")
        .eq("owner_id", user.id)
        .maybeSingle();

      const ownerId = salon?.owner_id ?? user.id;

      // Admin client bypassa RLS — garante leitura mesmo sem política de select
      const admin = createAdminClient();
      const { data: sub } = await admin
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (sub?.status === "trialing" && sub.current_period_end) {
        const msLeft = new Date(sub.current_period_end).getTime() - Date.now();
        trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      }
    }
  } catch {
    // non-critical — layout still renders without banner
  }

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {trialDaysLeft !== null && <TrialBanner daysLeft={trialDaysLeft} />}
        <MobileNav />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
