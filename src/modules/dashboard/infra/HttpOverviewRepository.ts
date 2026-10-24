import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { DELIVERY_STATUSES } from "@/modules/deliveries/domain/Delivery";
import { z } from "zod";
import type { Overview, OverviewRepository } from "../domain/Overview";

const overviewSchema = z.object({
  metrics: z.object({
    clients: z.number(),
    deliverymen: z.number(),
    activeDeliveries: z.number(),
    deliveredRevenue: z.coerce.number(),
    deliveredRevenuePreviousPeriod: z.coerce.number().nullish(),
  }),
  latestDeliveries: z.array(
    z.object({
      id: z.number(),
      status: z.enum(DELIVERY_STATUSES),
      amount: z.coerce.number(),
      clientName: z.string(),
      deliverymanName: z.string(),
    }),
  ),
});

export class HttpOverviewRepository implements OverviewRepository {
  constructor(private readonly http: HttpClient) {}

  async load(range: { start: Date; end: Date }, signal?: AbortSignal): Promise<Overview> {
    const data = await this.http.request({
      method: "GET",
      path: "/dashboard/overview",
      query: { startDate: range.start.toISOString(), endDate: range.end.toISOString() },
      signal,
    });
    const parsed = parseResponse(overviewSchema, data);
    return {
      metrics: {
        ...parsed.metrics,
        deliveredRevenuePreviousPeriod: parsed.metrics.deliveredRevenuePreviousPeriod ?? null,
      },
      latestDeliveries: parsed.latestDeliveries,
    };
  }
}
