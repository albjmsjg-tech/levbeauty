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

export interface Service {
  id: number | string;
  name: string;
  emoji: string;
  duration: string;
  price: number;
  active: boolean;
  desc?: string;
  rating?: number;
  inputs: number[];
  profitMargin: number;
  taxPct: number;
  cardPct: number;
  mktPct: number;
  manicurePct: number;
}

export interface Input {
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
