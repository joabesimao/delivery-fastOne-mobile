import type { Delivery, DeliveryPerson, DeliveryStatus } from "./Delivery";

export interface DeliveryRepository {
  list(signal?: AbortSignal): Promise<Delivery[]>;
  getById(id: number, signal?: AbortSignal): Promise<Delivery>;
  updateStatus(id: number, status: DeliveryStatus): Promise<Delivery>;
  assignDeliveryman(id: number, deliverymanId: number): Promise<Delivery>;
  listDeliverymen(signal?: AbortSignal): Promise<DeliveryPerson[]>;
}
