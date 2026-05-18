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
  taxPct: number;
  cardPct: number;
  fixedCostPct: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
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
export type PaymentMethod = "pix" | "credit" | "local" | "dinheiro" | "outro";
export type AppointmentLocation = "salon" | "home";

export interface AppointmentItem {
  id?: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMin: number;
  position: number;
}

export interface Appointment {
  id: number | string;
  clientId?: string;
  name: string;
  phone: string;
  date?: string;
  time: string;
  status: AppointmentStatus;
  totalPrice: number;
  travelFee: number;
  clientCep?: string;
  location: AppointmentLocation;
  payment: PaymentMethod;
  notes?: string;
  items: AppointmentItem[];
}

export interface FixedCost {
  id: number | string;
  name: string;
  val: number;
}

export interface SalonHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}
