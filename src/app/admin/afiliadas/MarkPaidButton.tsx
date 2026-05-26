"use client";

import { useTransition } from "react";
import { markCommissionPaid } from "./actions";

export function MarkPaidButton({ affiliateId, disabled }: { affiliateId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending || disabled}
      onClick={() => startTransition(() => markCommissionPaid(affiliateId))}
      className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blush text-cream border-blush hover:bg-blush/90"
    >
      {pending ? "Salvando…" : "Marcar como pago"}
    </button>
  );
}
