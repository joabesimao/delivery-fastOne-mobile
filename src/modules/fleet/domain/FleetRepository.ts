import type {
  FleetFilter,
  FuelRefill,
  NewFuelRefill,
  NewOilChange,
  OilChange,
  Vehicle,
  VehicleInput,
} from "./Fleet";

export interface FleetRepository {
  listVehicles(signal?: AbortSignal): Promise<Vehicle[]>;
  addVehicle(input: VehicleInput): Promise<void>;
  updateVehicle(id: number, input: VehicleInput): Promise<void>;
  removeVehicle(id: number): Promise<void>;
  listFuelRefills(filter: FleetFilter, signal?: AbortSignal): Promise<FuelRefill[]>;
  listOilChanges(filter: FleetFilter, signal?: AbortSignal): Promise<OilChange[]>;
  addFuelRefill(input: NewFuelRefill): Promise<void>;
  updateFuelRefill(id: number, input: NewFuelRefill): Promise<void>;
  removeFuelRefill(id: number): Promise<void>;
  addOilChange(input: NewOilChange): Promise<void>;
  updateOilChange(id: number, input: NewOilChange): Promise<void>;
  removeOilChange(id: number): Promise<void>;
  getOilChangeInterval(signal?: AbortSignal): Promise<number | null>;
  setOilChangeInterval(km: number): Promise<void>;
}

// Sem vínculo conta → entregador no backend, o próprio entregador escolhe o veículo dele.
export interface VehiclePreference {
  get(): Promise<number | null>;
  set(vehicleId: number | null): Promise<void>;
}
