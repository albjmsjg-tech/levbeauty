import type { Input } from "@/types";

export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (v: number) => `${v.toFixed(1)}%`;

export function computeUnitCost(inp: Input): number {
  return (inp.pkgCost / inp.pkgQty) * inp.perApplication;
}

export interface RealProfitResult {
  tax: number;
  card: number;
  fixed: number;
  inputCost: number;
  totalDeductions: number;
  netProfit: number;
  profitPct: number;
  distribution: {
    profit: number;
    input: number;
    tax: number;
    card: number;
    fixed: number;
  };
}

export function calcRealProfit({
  price,
  inputCost,
  taxPct,
  cardPct,
  fixedPct,
}: {
  price: number;
  inputCost: number;
  taxPct: number;
  cardPct: number;
  fixedPct: number;
}): RealProfitResult {
  const tax = price * (taxPct / 100);
  const card = price * (cardPct / 100);
  const fixed = price * (fixedPct / 100);
  const totalDeductions = inputCost + tax + card + fixed;
  const netProfit = price - totalDeductions;
  const profitPct = price > 0 ? (netProfit / price) * 100 : 0;

  return {
    tax,
    card,
    fixed,
    inputCost,
    totalDeductions,
    netProfit,
    profitPct,
    distribution: {
      profit: profitPct,
      input: price > 0 ? (inputCost / price) * 100 : 0,
      tax: taxPct,
      card: cardPct,
      fixed: fixedPct,
    },
  };
}

export function estimateDistance(cepClient: string, cepBase: string): number {
  const clientNum = parseInt(cepClient.replace(/\D/g, "").slice(-4)) || 0;
  const baseNum = parseInt(cepBase.replace(/\D/g, "").slice(-4)) || 0;
  const diff = Math.abs(clientNum - baseNum);
  return Math.min(25, Math.round(((diff % 200) / 8) * 10) / 10);
}

export function formatCEP(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
