import type { FuelRefill, NewFuelRefill, NewOilChange, OilChange, Vehicle } from "./Fleet";

export interface FleetRepository {
  listVehicles(signal?: AbortSignal): Promise<Vehicle[]>;
  listFuelRefills(vehicleId: number, signal?: AbortSignal): Promise<FuelRefill[]>;
  listOilChanges(vehicleId: number, signal?: AbortSignal): Promise<OilChange[]>;
  addFuelRefill(input: NewFuelRefill): Promise<void>;
  addOilChange(input: NewOilChange): Promise<void>;
}

// Sem vínculo conta → entregador no backend, o próprio entregador escolhe o veículo dele.
export interface VehiclePreference {
  get(): Promise<number | null>;
  set(vehicleId: number | null): Promise<void>;
}
