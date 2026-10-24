import type { Delivery, DeliveryPerson, DeliveryStatus } from "./Delivery";

export interface NewDelivery {
  registerId: number;
  deliverymanId: number | null;
  quantity: string;
  amount: number;
}

export interface DeliveryRepository {
  create(input: NewDelivery): Promise<{ id: number | null }>;
  list(signal?: AbortSignal): Promise<Delivery[]>;
  getById(id: number, signal?: AbortSignal): Promise<Delivery>;
  updateStatus(id: number, status: DeliveryStatus): Promise<Delivery>;
  assignDeliveryman(id: number, deliverymanId: number): Promise<Delivery>;
  listDeliverymen(signal?: AbortSignal): Promise<DeliveryPerson[]>;
}
