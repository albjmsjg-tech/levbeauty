import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const subscriptionPlans = [
  {
    id: "pro",
    name: "PRO",
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
    features: [
      "Até 50 agendamentos/mês",
      "App da cliente",
      "Dashboard básico",
      "Agenda online",
      "1 profissional",
    ],
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: 99.9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "",
    recommended: true,
    features: [
      "Agendamentos ilimitados",
      "App da cliente",
      "Dashboard completo",
      "Módulo de precificação",
      "Gestão de insumos",
      "Relatório financeiro CSV",
      "Até 3 profissionais",
    ],
  },
  {
    id: "elite",
    name: "ELITE",
    price: 149.9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID || "",
    features: [
      "Tudo do PREMIUM",
      "Multi-salão",
      "Profissionais ilimitados",
      "Atendimento a domicílio",
      "Exportação de relatórios",
      "Suporte prioritário",
      "Customização da marca",
    ],
  },
];
