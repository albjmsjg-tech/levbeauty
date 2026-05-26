"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Gift, Users, TrendingUp, DollarSign } from "lucide-react";
import { fmt } from "@/lib/utils";

const APP_URL = "https://levbeauty.vercel.app";

type Affiliate = { id: string; slug: string; type: string; status: string; contract_end: string | null };
type Stats     = { total: number; converted: number; pending: number };

export default function AfíliadasPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats]         = useState<Stats>({ total: 0, converted: 0, pending: 0 });
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [copied, setCopied]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/affiliates");
    const data = await res.json();
    setAffiliate(data.affiliate ?? null);
    if (data.stats) setStats(data.stats);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    await fetch("/api/affiliates", { method: "POST" });
    await load();
    setCreating(false);
  };

  const refLink = affiliate ? `${APP_URL}/cadastro?ref=${affiliate.slug}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cards = [
    { label: "Indicadas",         val: String(stats.total),     icon: Users,      note: "total de indicações"         },
    { label: "Convertidas",       val: String(stats.converted), icon: TrendingUp, note: "assinaram o plano"            },
    { label: "Comissão pendente", val: fmt(stats.pending),      icon: DollarSign, note: `R$25 × ${stats.converted} conv.` },
  ];

  return (
    <div className="p-6 lg:p-8 bg-cream min-h-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-onyx leading-tight">Indicar e Ganhar</h1>
        <p className="font-sans text-sm text-silver mt-1">
          Indique profissionais para o LevBeauty e ganhe R$25 por cada conversão
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-silver/20 animate-pulse" />)}
        </div>

      ) : !affiliate ? (
        /* ── Onboarding state ── */
        <div className="bg-white rounded-2xl border border-silver/20 p-8 text-center max-w-md mx-auto mt-8">
          <div className="w-14 h-14 rounded-full bg-blush/10 flex items-center justify-center mx-auto mb-4">
            <Gift size={24} className="text-blush" />
          </div>
          <h2 className="font-display text-xl font-semibold text-onyx mb-2">Torne-se afiliada</h2>
          <p className="font-sans text-sm text-silver mb-5 leading-relaxed">
            Gere seu link único e comece a indicar outras profissionais. A cada nova assinante que vier pelo seu link, você ganha R$25.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-blush text-cream font-sans font-semibold text-sm px-6 py-3 rounded-xl hover:bg-blush/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {creating ? "Gerando link…" : "Gerar meu link"}
          </button>
        </div>

      ) : (
        /* ── Active affiliate ── */
        <div className="flex flex-col gap-5">

          {/* Link card */}
          <div className="bg-white rounded-2xl border border-silver/20 p-6">
            <p className="font-sans text-xs text-silver font-medium tracking-widest uppercase mb-3">
              Seu link único
            </p>
            <div className="flex items-center gap-3 bg-cream rounded-xl p-3 border border-silver/20">
              <span className="font-sans text-sm text-onyx flex-1 truncate min-w-0">{refLink}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-blush text-cream font-sans text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blush/90 transition-colors flex-shrink-0"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            {affiliate.type === "ambassador" && (
              <p className="font-sans text-xs text-blush font-medium mt-2.5">
                ✦ Embaixadora LevBeauty
                {affiliate.contract_end
                  ? ` — contrato até ${new Date(affiliate.contract_end).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-silver/20 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-sans text-xs text-silver font-medium">{c.label}</p>
                    <Icon size={15} className="text-silver/50" />
                  </div>
                  <p className="font-display text-2xl font-semibold text-onyx">{c.val}</p>
                  <p className="font-sans text-xs text-silver mt-1">{c.note}</p>
                </div>
              );
            })}
          </div>

          {/* Rule */}
          <div className="bg-blush/10 border border-blush/20 rounded-xl p-4">
            <p className="font-sans text-sm text-onyx leading-relaxed">
              <span className="font-semibold">Importante:</span> você precisa ter assinatura ativa para receber comissões. Comissões ficam pendentes até confirmação de pagamento.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl border border-silver/20 p-5">
            <p className="font-sans text-xs text-silver font-medium tracking-widest uppercase mb-3">Como funciona</p>
            <ol className="space-y-2">
              {[
                "Compartilhe seu link com profissionais da beleza",
                "Elas se cadastram e começam o teste grátis de 14 dias",
                "Quando assinam o plano, você recebe R$25 de comissão",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blush/20 text-blush font-sans text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="font-sans text-sm text-silver">{step}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      )}
    </div>
  );
}
