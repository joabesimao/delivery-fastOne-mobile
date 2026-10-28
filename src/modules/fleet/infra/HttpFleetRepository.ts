import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import type { KeyValueStorage } from "@/core/storage/KeyValueStorage";
import { z } from "zod";
import type {
  FleetFilter,
  FuelRefill,
  NewFuelRefill,
  NewOilChange,
  OilChange,
  Vehicle,
  VehicleInput,
} from "../domain/Fleet";
import type { FleetRepository, VehiclePreference } from "../domain/FleetRepository";

const vehicleSchema = z.object({
  id: z.number(),
  plate: z.string(),
  model: z.string(),
  brand: z.string().nullish(),
  deliverymanId: z.number().nullish(),
});

const vehicleRefSchema = z.object({ plate: z.string() }).nullish();

const deliverymanRefSchema = z
  .object({ name: z.string(), lastName: z.string().nullish() })
  .nullish();

const personName = (dto: z.infer<typeof deliverymanRefSchema>) =>
  dto ? `${dto.name} ${dto.lastName ?? ""}`.trim() : "";

const fuelRefillSchema = z.object({
  id: z.number(),
  vehicleId: z.number(),
  vehicle: vehicleRefSchema,
  deliverymanId: z.number(),
  deliveryman: deliverymanRefSchema,
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
  deliverymanId: z.number(),
  deliveryman: deliverymanRefSchema,
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
  deliverymanId: dto.deliverymanId,
  deliverymanName: personName(dto.deliveryman),
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
  deliverymanId: dto.deliverymanId,
  deliverymanName: personName(dto.deliveryman),
  km: dto.km,
  nextChangeKm: dto.nextChangeKm,
  changeDate: new Date(dto.changeDate),
});

const vehicleBody = (input: VehicleInput) => ({
  plate: input.plate.trim().toUpperCase(),
  model: input.model.trim(),
  brand: input.brand,
  deliverymanId: input.deliverymanId,
});

export class HttpFleetRepository implements FleetRepository {
  constructor(private readonly http: HttpClient) {}

  async listVehicles(signal?: AbortSignal): Promise<Vehicle[]> {
    const data = await this.http.request({ method: "GET", path: "/vehicle", signal });
    return parseResponse(z.array(vehicleSchema), data).map(toVehicle);
  }

  async addVehicle(input: VehicleInput): Promise<void> {
    await this.http.request({ method: "POST", path: "/vehicle", body: vehicleBody(input) });
  }

  async updateVehicle(id: number, input: VehicleInput): Promise<void> {
    await this.http.request({ method: "PUT", path: `/vehicle/${id}`, body: vehicleBody(input) });
  }

  async removeVehicle(id: number): Promise<void> {
    await this.http.request({ method: "DELETE", path: `/vehicle/${id}` });
  }

  async listFuelRefills(filter: FleetFilter, signal?: AbortSignal): Promise<FuelRefill[]> {
    const data = await this.http.request({
      method: "GET",
      path: "/fuel-refill",
      query: { ...filter },
      signal,
    });
    return parseResponse(z.array(fuelRefillSchema), data).map(toFuelRefill);
  }

  async listOilChanges(filter: FleetFilter, signal?: AbortSignal): Promise<OilChange[]> {
    const data = await this.http.request({
      method: "GET",
      path: "/oil-change-log",
      query: { ...filter },
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

  async updateFuelRefill(id: number, input: NewFuelRefill): Promise<void> {
    await this.http.request({
      method: "PUT",
      path: `/fuel-refill/${id}`,
      body: { ...input, refillDate: input.refillDate.toISOString() },
    });
  }

  async removeFuelRefill(id: number): Promise<void> {
    await this.http.request({ method: "DELETE", path: `/fuel-refill/${id}` });
  }

  async addOilChange(input: NewOilChange): Promise<void> {
    await this.http.request({
      method: "POST",
      path: "/oil-change-log",
      body: { ...input, changeDate: input.changeDate.toISOString() },
    });
  }

  async updateOilChange(id: number, input: NewOilChange): Promise<void> {
    await this.http.request({
      method: "PUT",
      path: `/oil-change-log/${id}`,
      body: { ...input, changeDate: input.changeDate.toISOString() },
    });
  }

  async removeOilChange(id: number): Promise<void> {
    await this.http.request({ method: "DELETE", path: `/oil-change-log/${id}` });
  }

  // Sem configuração salva a API devolve null.
  async getOilChangeInterval(signal?: AbortSignal): Promise<number | null> {
    const data = await this.http.request({ method: "GET", path: "/oil-change-config", signal });
    return (
      parseResponse(z.object({ intervalKm: z.coerce.number() }).nullish(), data)?.intervalKm ?? null
    );
  }

  async setOilChangeInterval(km: number): Promise<void> {
    await this.http.request({
      method: "PUT",
      path: "/oil-change-config",
      body: { intervalKm: km },
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
