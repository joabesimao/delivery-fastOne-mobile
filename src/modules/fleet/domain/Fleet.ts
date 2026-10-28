export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  brand: string | null;
  deliverymanId: number | null;
}

export interface FuelRefill {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  deliverymanId: number;
  deliverymanName: string;
  km: number;
  kmDriven: number | null;
  liters: number;
  pricePerLiter: number | null;
  totalValue: number;
  refillDate: Date;
}

export interface OilChange {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  deliverymanId: number;
  deliverymanName: string;
  km: number;
  nextChangeKm: number;
  changeDate: Date;
}

export interface NewFuelRefill {
  vehicleId: number;
  deliverymanId: number;
  km: number;
  liters: number;
  pricePerLiter: number;
  totalValue: number;
  refillDate: Date;
}

export interface NewOilChange {
  vehicleId: number;
  deliverymanId: number;
  km: number;
  changeDate: Date;
}

export interface VehicleInput {
  plate: string;
  model: string;
  brand: string | null;
  deliverymanId: number | null;
}

export interface FleetFilter {
  vehicleId?: number;
  deliverymanId?: number;
}

export const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export const validateVehicle = (input: { plate: string; model: string }) => {
  const errors: FieldErrors<"plate" | "model"> = {};
  if (normalizePlate(input.plate).length < 7) errors.plate = "Informe a placa do veículo.";
  if (!input.model.trim()) errors.model = "Informe o modelo.";
  return errors;
};

export const validateOilInterval = (km: number) =>
  Number.isInteger(km) && km > 0 ? null : "Informe um intervalo em km maior que zero.";

export const vehicleLabel = (vehicle: Pick<Vehicle, "plate" | "model" | "brand">) =>
  [vehicle.plate, [vehicle.brand, vehicle.model].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

// Mesmo cálculo do painel web: total só quando litros e preço formam um valor positivo.
export const computeTotalValue = (liters: number, pricePerLiter: number): number | null => {
  const total = liters * pricePerLiter;
  return Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : null;
};

export const consumptionKmPerLiter = (refill: Pick<FuelRefill, "kmDriven" | "liters">) =>
  refill.kmDriven && refill.liters > 0 ? refill.kmDriven / refill.liters : null;

export const lastKnownKm = (refills: readonly FuelRefill[], oilChanges: readonly OilChange[]) =>
  Math.max(0, ...refills.map((r) => r.km), ...oilChanges.map((o) => o.km));

export type OilChangeStatus =
  | { kind: "unknown" }
  | { kind: "ok" | "soon" | "overdue"; nextChangeKm: number; remainingKm: number };

const OIL_SOON_THRESHOLD_KM = 500;

export const oilChangeStatus = (
  latest: OilChange | undefined,
  currentKm: number,
): OilChangeStatus => {
  if (!latest) return { kind: "unknown" };
  const remainingKm = latest.nextChangeKm - currentKm;
  const kind = remainingKm <= 0 ? "overdue" : remainingKm <= OIL_SOON_THRESHOLD_KM ? "soon" : "ok";
  return { kind, nextChangeKm: latest.nextChangeKm, remainingKm };
};

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const validateFuelRefill = (input: {
  km: number;
  liters: number;
  pricePerLiter: number;
}): FieldErrors<"km" | "liters" | "pricePerLiter"> => {
  const errors: FieldErrors<"km" | "liters" | "pricePerLiter"> = {};
  if (!Number.isInteger(input.km) || input.km <= 0) errors.km = "Informe a quilometragem atual.";
  if (!(input.liters > 0)) errors.liters = "Informe os litros abastecidos.";
  if (!(input.pricePerLiter > 0)) errors.pricePerLiter = "Informe o preço por litro.";
  return errors;
};

export const validateOilChange = (input: { km: number }): FieldErrors<"km"> =>
  !Number.isInteger(input.km) || input.km <= 0 ? { km: "Informe a quilometragem da troca." } : {};
