"use client";

import { useRouter } from "next/navigation";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const router = useRouter();
  const label =
    daysLeft <= 0 ? "hoje"
    : daysLeft === 1 ? "em 1 dia"
    : `em ${daysLeft} dias`;

  return (
    <div className="w-full bg-blush text-cream flex items-center justify-center gap-3 py-2 px-4 flex-shrink-0">
      <span className="font-sans text-sm">
        Seu teste grátis termina {label}
      </span>
      <button
        onClick={() => router.push("/assinar")}
        className="bg-cream text-blush font-sans text-xs font-semibold px-3 py-1 rounded-full hover:bg-cream/90 transition-colors"
      >
        Assinar agora
      </button>
    </div>
  );
}
