"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

const PRICE_ID = "price_1Tb7789yiUhGSlEdjVDRu3bt";

const BENEFITS = [
  "Agenda online para suas clientes",
  "Dashboard com métricas do negócio",
  "Gestão de insumos e precificação",
  "Relatórios financeiros em CSV",
  "Notificações automáticas por WhatsApp",
  "Suporte por chat",
];

const COUPON_LABELS: Record<string, string> = {
  LVB50:  "50% de desconto no primeiro mês",
  LVB100: "Primeiro mês grátis",
};

function AssinarForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const couponCode   = searchParams.get("coupon")?.toUpperCase() ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: PRICE_ID, couponCode }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Erro ao iniciar checkout.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-onyx tracking-tight">
            lev<span className="text-blush">beauty</span>
          </h1>
          <p className="font-sans text-sm text-silver mt-1">para profissionais da beleza</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-silver/20 p-8 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-onyx mb-1">
            Continue usando o LevBeauty
          </h2>
          <p className="font-sans text-sm text-silver mb-6">
            Seu período de teste encerrou. Assine para continuar.
          </p>

          {/* Cupom banner */}
          {couponCode && COUPON_LABELS[couponCode] && (
            <div className="bg-blush/10 border border-blush/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <Check size={14} className="text-blush flex-shrink-0" />
              <p className="font-sans text-sm text-onyx font-medium">
                Cupom <span className="text-blush">{couponCode}</span> — {COUPON_LABELS[couponCode]}
              </p>
            </div>
          )}

          {/* Preço */}
          <div className="bg-cream rounded-xl p-5 mb-6 border border-silver/20">
            <p className="font-sans text-xs text-silver font-medium tracking-widest uppercase mb-1">
              Plano Pro
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className="font-sans text-sm text-silver mr-0.5">R$</span>
              <span className="font-display text-4xl font-bold text-onyx">49</span>
              <span className="font-display text-xl font-semibold text-onyx">,90</span>
              <span className="font-sans text-sm text-silver ml-1">/mês</span>
            </div>
            <p className="font-sans text-xs text-silver mt-1">Cancele quando quiser</p>
          </div>

          {/* Benefícios */}
          <ul className="space-y-2.5 mb-7">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-blush/20 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-blush" />
                </div>
                <span className="font-sans text-sm text-onyx">{b}</span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="font-sans text-xs text-red-500 mb-3 text-center">{error}</p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-blush text-cream font-sans font-semibold text-sm py-3.5 rounded-xl hover:bg-blush/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecionando…" : "Assinar agora"}
          </button>

          <button
            onClick={() => router.push("/login")}
            className="w-full mt-2 font-sans text-xs text-silver py-2 hover:text-onyx transition-colors"
          >
            Usar outra conta
          </button>
        </div>

      </div>
    </div>
  );
}

export default function AssinarPage() {
  return (
    <Suspense fallback={null}>
      <AssinarForm />
    </Suspense>
  );
}
