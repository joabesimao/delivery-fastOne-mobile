import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import type { KeyValueStorage } from "@/core/storage/KeyValueStorage";
import { z } from "zod";
import type { FuelRefill, NewFuelRefill, NewOilChange, OilChange, Vehicle } from "../domain/Fleet";
import type { FleetRepository, VehiclePreference } from "../domain/FleetRepository";

const vehicleSchema = z.object({
  id: z.number(),
  plate: z.string(),
  model: z.string(),
  brand: z.string().nullish(),
  deliverymanId: z.number().nullish(),
});

const vehicleRefSchema = z.object({ plate: z.string() }).nullish();

const fuelRefillSchema = z.object({
  id: z.number(),
  vehicleId: z.number(),
  vehicle: vehicleRefSchema,
  km: z.coerce.number(),
  kmDriven: z.coerce.number().nullish(),
  liters: z.coerce.number(),
  pricePerLiter: z.coerce.number().nullish(),
  totalValue: z.coerce.number(),
  refillDate: z.string(),
});

const oilChangeSchema = z.object({
  id: z.number(),
  vehicleId: z.number(),
  vehicle: vehicleRefSchema,
  km: z.coerce.number(),
  nextChangeKm: z.coerce.number(),
  changeDate: z.string(),
});

const toVehicle = (dto: z.infer<typeof vehicleSchema>): Vehicle => ({
  id: dto.id,
  plate: dto.plate,
  model: dto.model,
  brand: dto.brand ?? null,
  deliverymanId: dto.deliverymanId ?? null,
});

const toFuelRefill = (dto: z.infer<typeof fuelRefillSchema>): FuelRefill => ({
  id: dto.id,
  vehicleId: dto.vehicleId,
  vehiclePlate: dto.vehicle?.plate ?? "",
  km: dto.km,
  kmDriven: dto.kmDriven ?? null,
  liters: dto.liters,
  pricePerLiter: dto.pricePerLiter ?? null,
  totalValue: dto.totalValue,
  refillDate: new Date(dto.refillDate),
});

const toOilChange = (dto: z.infer<typeof oilChangeSchema>): OilChange => ({
  id: dto.id,
  vehicleId: dto.vehicleId,
  vehiclePlate: dto.vehicle?.plate ?? "",
  km: dto.km,
  nextChangeKm: dto.nextChangeKm,
  changeDate: new Date(dto.changeDate),
});

export class HttpFleetRepository implements FleetRepository {
  constructor(private readonly http: HttpClient) {}

  async listVehicles(signal?: AbortSignal): Promise<Vehicle[]> {
    const data = await this.http.request({ method: "GET", path: "/vehicle", signal });
    return parseResponse(z.array(vehicleSchema), data).map(toVehicle);
  }

  async listFuelRefills(vehicleId: number, signal?: AbortSignal): Promise<FuelRefill[]> {
    const data = await this.http.request({
      method: "GET",
      path: "/fuel-refill",
      query: { vehicleId },
      signal,
    });
    return parseResponse(z.array(fuelRefillSchema), data).map(toFuelRefill);
  }

  async listOilChanges(vehicleId: number, signal?: AbortSignal): Promise<OilChange[]> {
    const data = await this.http.request({
      method: "GET",
      path: "/oil-change-log",
      query: { vehicleId },
      signal,
    });
    return parseResponse(z.array(oilChangeSchema), data).map(toOilChange);
  }

  async addFuelRefill(input: NewFuelRefill): Promise<void> {
    await this.http.request({
      method: "POST",
      path: "/fuel-refill",
      body: { ...input, refillDate: input.refillDate.toISOString() },
    });
  }

  async addOilChange(input: NewOilChange): Promise<void> {
    await this.http.request({
      method: "POST",
      path: "/oil-change-log",
      body: { ...input, changeDate: input.changeDate.toISOString() },
    });
  }
}

const VEHICLE_KEY = "fastone.courier.vehicleId";

export class StorageVehiclePreference implements VehiclePreference {
  constructor(private readonly storage: KeyValueStorage) {}

  async get(): Promise<number | null> {
    const raw = await this.storage.get(VEHICLE_KEY);
    const id = Number(raw);
    return raw && Number.isInteger(id) && id > 0 ? id : null;
  }

  set(vehicleId: number | null): Promise<void> {
    return vehicleId === null
      ? this.storage.remove(VEHICLE_KEY)
      : this.storage.set(VEHICLE_KEY, String(vehicleId));
  }
}
