import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmt } from "@/lib/utils";
import { MarkPaidButton } from "./MarkPaidButton";

const ADMIN_EMAIL = "alana@minhalev.com.br";

type AffiliateRow = {
  id: string;
  slug: string;
  type: string;
  status: string;
  created_at: string;
  owner_id: string;
};

type ReferralRow = {
  affiliate_id: string;
  converted_at: string | null;
  commission_status: string;
  commission_amount: number;
};

export default async function AdminAfíliadasPage() {
  // ── Auth guard ────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/painel/dashboard");

  const admin = createAdminClient();

  // ── Fetch data ────────────────────────────────────────────────────
  const { data: affiliates = [] } = await admin
    .from("affiliates")
    .select("id, slug, type, status, created_at, owner_id")
    .order("created_at", { ascending: false });

  const rows = (affiliates ?? []) as AffiliateRow[];
  const ownerIds    = rows.map(a => a.owner_id);
  const affiliateIds = rows.map(a => a.id);

  const [profilesRes, referralsRes] = await Promise.all([
    ownerIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    affiliateIds.length > 0
      ? admin.from("referrals")
          .select("affiliate_id, converted_at, commission_status, commission_amount")
          .in("affiliate_id", affiliateIds)
      : Promise.resolve({ data: [] as ReferralRow[] }),
  ]);

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map(p => [p.id, p.full_name as string])
  );

  const allReferrals = (referralsRes.data ?? []) as ReferralRow[];

  // ── Compute per-affiliate stats ───────────────────────────────────
  const computed = rows.map(a => {
    const refs = allReferrals.filter(r => r.affiliate_id === a.id);
    const total     = refs.length;
    const converted = refs.filter(r => r.converted_at !== null).length;
    const pending   = refs
      .filter(r => r.converted_at !== null && r.commission_status === "pending")
      .reduce((s, r) => s + Number(r.commission_amount), 0);
    return { ...a, name: profileMap[a.owner_id] ?? "—", total, converted, pending };
  });

  const totalPending = computed.reduce((s, r) => s + r.pending, 0);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <p className="font-sans text-xs text-silver font-medium tracking-widest uppercase mb-1">Admin</p>
            <h1 className="font-display text-3xl font-semibold text-onyx">Afiliadas</h1>
            <p className="font-sans text-sm text-silver mt-1">
              {computed.length} afiliada{computed.length !== 1 ? "s" : ""} cadastrada{computed.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total pending */}
          <div className="bg-white rounded-xl border border-silver/20 px-5 py-4 text-right">
            <p className="font-sans text-xs text-silver font-medium tracking-widest uppercase mb-0.5">
              Comissões pendentes (total)
            </p>
            <p className="font-display text-2xl font-semibold text-blush">{fmt(totalPending)}</p>
          </div>
        </div>

        {computed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-silver/20 p-12 text-center">
            <p className="font-sans text-sm text-silver">Nenhuma afiliada cadastrada ainda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-silver/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-silver/20 bg-cream/60">
                    {["Nome", "Slug", "Tipo", "Cadastro", "Indicadas", "Convertidas", "Comissão pendente", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-sans text-xs font-semibold text-silver tracking-widest uppercase whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-silver/10 last:border-0 ${i % 2 === 0 ? "" : "bg-cream/30"}`}
                    >
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <p className="font-sans text-sm font-semibold text-onyx whitespace-nowrap">{a.name}</p>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3">
                        <span className="font-sans text-xs text-silver bg-cream px-2 py-0.5 rounded-md">
                          {a.slug}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className={`font-sans text-xs font-semibold px-2 py-0.5 rounded-full ${
                          a.type === "ambassador"
                            ? "bg-blush/15 text-blush"
                            : "bg-silver/15 text-silver"
                        }`}>
                          {a.type === "ambassador" ? "Embaixadora" : "Afiliada"}
                        </span>
                      </td>

                      {/* Cadastro */}
                      <td className="px-4 py-3 font-sans text-xs text-silver whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </td>

                      {/* Indicadas */}
                      <td className="px-4 py-3 font-sans text-sm text-onyx text-center">
                        {a.total}
                      </td>

                      {/* Convertidas */}
                      <td className="px-4 py-3 font-sans text-sm font-semibold text-onyx text-center">
                        {a.converted}
                      </td>

                      {/* Comissão pendente */}
                      <td className="px-4 py-3">
                        <span className={`font-sans text-sm font-semibold ${a.pending > 0 ? "text-blush" : "text-silver"}`}>
                          {fmt(a.pending)}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="px-4 py-3">
                        <MarkPaidButton
                          affiliateId={a.id}
                          disabled={a.pending === 0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
