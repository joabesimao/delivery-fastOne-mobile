import type { DeliveryStatus } from "@/modules/deliveries/domain/Delivery";

export interface SearchResults {
  orders: {
    id: number;
    status: DeliveryStatus;
    amount: number;
    clientName: string;
    deliverymanName: string | null;
  }[];
  clients: { id: number; name: string; cpf: string; phone: string }[];
  deliverymen: { id: number; name: string; phone: string }[];
}

// A API ignora termos com menos de 2 letras.
export const MIN_SEARCH_LENGTH = 2;

export const isSearchable = (term: string) => term.trim().length >= MIN_SEARCH_LENGTH;

export const isEmptyResult = (r: SearchResults) =>
  r.orders.length + r.clients.length + r.deliverymen.length === 0;

export interface SearchRepository {
  search(term: string, signal?: AbortSignal): Promise<SearchResults>;
}
