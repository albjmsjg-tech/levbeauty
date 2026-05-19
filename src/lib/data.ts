import type { Appointment, FixedCost, Input, SalonConfig, Service } from "@/types";

export const defaultSalonConfig: SalonConfig = {
  name: "LevBeauty",
  phone: "(11) 99999-0000",
  address: "Rua das Flores, 123, São Paulo",
  cepBase: "01310-100",
  homeEnabled: true,
  maxRadiusKm: 15,
  pricePerKm: 2.5,
  minTravelFee: 20,
};

export const defaultServices: Service[] = [
  {
    id: 1, name: "Alongamento em Gel", emoji: "", duration: "2h 30min", price: 180,
    active: true, desc: "Unhas longas e naturais com gel resistente.", rating: 4.9,
    inputs: ["local-0", "local-1", "local-2", "local-4", "local-5", "local-6", "local-7"],
  },
  {
    id: 2, name: "Banho de Gel", emoji: "", duration: "1h 30min", price: 120,
    active: true, desc: "Capa protetora de gel brilhante sobre as unhas naturais.", rating: 4.8,
    inputs: ["local-0", "local-2", "local-4", "local-5", "local-6", "local-7"],
  },
  {
    id: 3, name: "Esmaltação em Gel", emoji: "", duration: "1h", price: 90,
    active: true, desc: "Esmalte em gel de longa duração, até 3 semanas.", rating: 4.9,
    inputs: ["local-2", "local-4", "local-5", "local-6", "local-7"],
  },
  {
    id: 4, name: "Manutenção", emoji: "", duration: "1h 15min", price: 80,
    active: true, desc: "Manutenção do alongamento com preenchimento.", rating: 4.7,
    inputs: ["local-0", "local-2", "local-4"],
  },
];

export const defaultInputs: Input[] = [
  { id: "local-0", name: "Builder Gel (10g)", unit: "g", pkgQty: 10, pkgCost: 45.0, perApplication: 2 },
  { id: "local-1", name: "Tips Soft Gel (cx 240un)", unit: "un", pkgQty: 240, pkgCost: 38.0, perApplication: 10 },
  { id: "local-2", name: "Primer (15ml)", unit: "ml", pkgQty: 15, pkgCost: 22.0, perApplication: 0.5 },
  { id: "local-3", name: "Acetona (500ml)", unit: "ml", pkgQty: 500, pkgCost: 8.0, perApplication: 10 },
  { id: "local-4", name: "Lixa de Arquivo", unit: "un", pkgQty: 12, pkgCost: 18.0, perApplication: 0.33 },
  { id: "local-5", name: "Esmalte Gel UV (6ml)", unit: "ml", pkgQty: 6, pkgCost: 35.0, perApplication: 0.4 },
  { id: "local-6", name: "Base Coat (8ml)", unit: "ml", pkgQty: 8, pkgCost: 28.0, perApplication: 0.5 },
  { id: "local-7", name: "Top Coat (8ml)", unit: "ml", pkgQty: 8, pkgCost: 32.0, perApplication: 0.5 },
];

export const defaultAppointments: Appointment[] = [
  { id: 1, name: "Ana Costa", time: "09:00", status: "concluído", totalPrice: 180, travelFee: 0, phone: "(11) 98888-0001", location: "salon", payment: "pix", items: [{ serviceId: "1", serviceName: "Alongamento em Gel", price: 180, durationMin: 150, position: 1 }] },
  { id: 2, name: "Mariana Lima", time: "11:00", status: "confirmado", totalPrice: 120, travelFee: 0, phone: "(11) 98888-0002", location: "salon", payment: "credit", items: [{ serviceId: "2", serviceName: "Banho de Gel", price: 120, durationMin: 90, position: 1 }] },
  { id: 3, name: "Julia Santos", time: "14:00", status: "confirmado", totalPrice: 90, travelFee: 0, phone: "(11) 98888-0003", location: "home", payment: "pix", items: [{ serviceId: "3", serviceName: "Esmaltação em Gel", price: 90, durationMin: 60, position: 1 }] },
  { id: 4, name: "Beatriz Rocha", time: "16:00", status: "pendente", totalPrice: 80, travelFee: 0, phone: "(11) 98888-0004", location: "salon", payment: "local", items: [{ serviceId: "4", serviceName: "Manutenção", price: 80, durationMin: 75, position: 1 }] },
];

export const defaultFixedCosts: FixedCost[] = [
  { id: 1, name: "Aluguel", val: 1200 },
  { id: 2, name: "Energia", val: 180 },
  { id: 3, name: "Pró-labore", val: 2000 },
  { id: 4, name: "Simples Nacional", val: 350 },
  { id: 5, name: "Internet/Tel", val: 120 },
  { id: 6, name: "Material extra", val: 200 },
];

export const weekDays = ["Dom 4", "Seg 5", "Ter 6", "Qua 7", "Qui 8", "Sex 9", "Sáb 10"];
export const allTimes = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
export const timeSlots = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];
export const allServiceNames = ["Alongamento em Gel","Banho de Gel","Esmaltação em Gel","Manutenção"];

export const statusColors: Record<string, { bg: string; color: string }> = {
  concluído: { bg: "oklch(92% 0.06 145)", color: "oklch(32% 0.1 145)" },
  confirmado: { bg: "oklch(93% 0.04 75)", color: "oklch(48% 0.1 70)" },
  pendente: { bg: "oklch(95% 0.03 60)", color: "oklch(48% 0.08 60)" },
  cancelado: { bg: "oklch(94% 0.04 15)", color: "oklch(48% 0.12 15)" },
};

export const statusList = ["pendente", "confirmado", "concluído", "cancelado"] as const;
export const unitOptions = ["g", "ml", "un", "cm", "m"];
