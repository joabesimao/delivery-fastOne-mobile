import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { DELIVERY_STATUSES } from "@/modules/deliveries/domain/Delivery";
import { z } from "zod";
import type { SearchRepository, SearchResults } from "../domain/Search";

const schema = z.object({
  orders: z.array(
    z.object({
      id: z.number(),
      status: z.enum(DELIVERY_STATUSES),
      amount: z.coerce.number(),
      clientName: z.string(),
      deliverymanName: z.string().nullish(),
    }),
  ),
  clients: z.array(
    z.object({ id: z.number(), name: z.string(), cpf: z.string(), phone: z.string() }),
  ),
  deliverymen: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      lastName: z.string().nullish(),
      phone: z.string(),
    }),
  ),
});

export class HttpSearchRepository implements SearchRepository {
  constructor(private readonly http: HttpClient) {}

  async search(term: string, signal?: AbortSignal): Promise<SearchResults> {
    const data = await this.http.request({
      method: "GET",
      path: "/search",
      query: { q: term.trim() },
      signal,
    });
    const parsed = parseResponse(schema, data);
    return {
      orders: parsed.orders.map((o) => ({ ...o, deliverymanName: o.deliverymanName ?? null })),
      clients: parsed.clients,
      deliverymen: parsed.deliverymen.map((d) => ({
        id: d.id,
        name: `${d.name} ${d.lastName ?? ""}`.trim(),
        phone: d.phone,
      })),
    };
  }
}
