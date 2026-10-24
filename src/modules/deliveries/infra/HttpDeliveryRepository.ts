import { AppError } from "@/core/errors/AppError";
import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { z } from "zod";
import {
  DELIVERY_STATUSES,
  type Delivery,
  type DeliveryPerson,
  type DeliveryStatus,
} from "../domain/Delivery";
import type { DeliveryRepository } from "../domain/DeliveryRepository";

const deliverymanSchema = z.object({
  id: z.number(),
  name: z.string(),
  lastName: z.string().nullish(),
  phone: z.string().nullish(),
});

const orderSchema = z.object({
  id: z.number(),
  quantity: z.coerce.string(),
  amount: z.coerce.number(),
  data: z.string(),
  finishedAt: z.string().nullish(),
  status: z.enum(DELIVERY_STATUSES),
  deliveryman: deliverymanSchema.nullish(),
  Register: z.object({
    client: z.object({ name: z.string(), phone: z.string().nullish() }),
    address: z.object({
      street: z.string(),
      numberHouse: z.coerce.number(),
      neighborhood: z.string(),
      city: z.string(),
      reference: z.string().nullish(),
    }),
  }),
});

type OrderDto = z.infer<typeof orderSchema>;
type DeliverymanDto = z.infer<typeof deliverymanSchema>;

export const toDeliveryPerson = (dto: DeliverymanDto): DeliveryPerson => ({
  id: dto.id,
  name: `${dto.name} ${dto.lastName ?? ""}`.trim(),
  phone: dto.phone ?? "",
});

export const toDelivery = (dto: OrderDto): Delivery => ({
  id: dto.id,
  quantity: dto.quantity,
  amount: dto.amount,
  date: new Date(dto.data),
  finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
  status: dto.status,
  client: { name: dto.Register.client.name, phone: dto.Register.client.phone ?? "" },
  address: {
    street: dto.Register.address.street,
    number: dto.Register.address.numberHouse,
    neighborhood: dto.Register.address.neighborhood,
    city: dto.Register.address.city,
    reference: dto.Register.address.reference ?? "",
  },
  deliveryman: dto.deliveryman ? toDeliveryPerson(dto.deliveryman) : null,
});

export class HttpDeliveryRepository implements DeliveryRepository {
  constructor(private readonly http: HttpClient) {}

  async list(signal?: AbortSignal): Promise<Delivery[]> {
    const data = await this.http.request({ method: "GET", path: "/orderDelivery", signal });
    return parseResponse(z.array(orderSchema), data).map(toDelivery);
  }

  async getById(id: number, signal?: AbortSignal): Promise<Delivery> {
    const data = await this.http.request({ method: "GET", path: `/orderDelivery/${id}`, signal });
    // A API responde 200 com `null` quando o pedido não existe.
    if (data === null || data === undefined)
      throw new AppError("not_found", "Pedido não encontrado.");
    return toDelivery(parseResponse(orderSchema, data));
  }

  async updateStatus(id: number, status: DeliveryStatus): Promise<Delivery> {
    const data = await this.http.request({
      method: "PUT",
      path: `/orderDelivery/${id}`,
      body: { status },
      // O backend aceita delivered → delivered, mas recusa finished → finished com 409:
      // repetir um "finalizar" cuja resposta se perdeu mostraria um erro falso.
      idempotent: status !== "finished",
    });
    return toDelivery(parseResponse(orderSchema, data));
  }

  async assignDeliveryman(id: number, deliverymanId: number): Promise<Delivery> {
    const data = await this.http.request({
      method: "PUT",
      path: `/orderDelivery/${id}`,
      body: { deliverymanId },
    });
    return toDelivery(parseResponse(orderSchema, data));
  }

  async listDeliverymen(signal?: AbortSignal): Promise<DeliveryPerson[]> {
    const data = await this.http.request({ method: "GET", path: "/deliveryman", signal });
    return parseResponse(z.array(deliverymanSchema), data).map(toDeliveryPerson);
  }
}
