export type UserRole = "owner" | "client";

export interface SalonConfig {
  name: string;
  phone: string;
  address: string;
  cepBase: string;
  homeEnabled: boolean;
  maxRadiusKm: number;
  pricePerKm: number;
  minTravelFee: number;
}

export interface PricingConfig {
  profitMargin: number;
  taxPct: number;
  cardPct: number;
  fixedCostPct: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  profitMargin: 35,
  taxPct: 7,
  cardPct: 3.3,
  fixedCostPct: 5,
};

export interface Service {
  id: number | string;
  name: string;
  emoji: string;
  duration: string;
  price: number;
  active: boolean;
  desc?: string;
  rating?: number;
  inputs: string[];
  manicurePct: number;
}

export interface Input {
  id?: string;
  name: string;
  unit: string;
  pkgQty: number;
  pkgCost: number;
  perApplication: number;
}

export type AppointmentStatus = "pendente" | "confirmado" | "concluído" | "cancelado";
export type PaymentMethod = "pix" | "credit" | "local";
export type AppointmentLocation = "salon" | "home";

export interface Appointment {
  id: number | string;
  name: string;
  svc: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  phone: string;
  location: AppointmentLocation;
  payment: PaymentMethod;
}

export interface FixedCost {
  id: number | string;
  name: string;
  val: number;
}

export interface PricingResult {
  selectedInpCost: number;
  idealPrice: number;
  grossProfit: number;
  netProfit: number;
  manicureCost: number;
}
