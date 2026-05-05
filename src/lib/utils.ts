import type { Input, Service } from "@/types";

export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (v: number) => `${v.toFixed(1)}%`;

export function computeUnitCost(inp: Input): number {
  return (inp.pkgCost / inp.pkgQty) * inp.perApplication;
}

export function calcPricing(svc: Service, allInputs: Input[]) {
  const selectedInpCost = svc.inputs.reduce(
    (acc, idx) => acc + (allInputs[idx] ? computeUnitCost(allInputs[idx]) : 0),
    0
  );
  const deductions = svc.taxPct + svc.cardPct + svc.mktPct + svc.manicurePct;
  const idealPrice =
    selectedInpCost / (1 - svc.profitMargin / 100 - deductions / 100);
  const grossProfit = idealPrice - selectedInpCost;
  const manicureCost = (idealPrice * svc.manicurePct) / 100;
  const netProfit =
    grossProfit -
    (idealPrice * (svc.taxPct + svc.cardPct + svc.mktPct)) / 100 -
    manicureCost;
  return { selectedInpCost, idealPrice, grossProfit, netProfit, manicureCost };
}

export function formatCEP(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function estimateDistance(cepClient: string, cepBase: string): number {
  const clientNum = parseInt(cepClient.replace(/\D/g, "").slice(-4)) || 0;
  const baseNum = parseInt(cepBase.replace(/\D/g, "").slice(-4)) || 0;
  const diff = Math.abs(clientNum - baseNum);
  return Math.min(25, Math.round(((diff % 200) / 8) * 10) / 10);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
