import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { z } from "zod";
import type {
  DashboardReport,
  DateRange,
  Performance,
  RankingPage,
  RankingStatus,
  ReportsRepository,
} from "../domain/Reports";

const namedValues = z.array(z.object({ name: z.string(), value: z.number() }));

const reportSchema = z.object({
  summary: z.object({
    totalOrders: z.number(),
    completedOrders: z.number(),
    pendingOrders: z.number(),
    totalRevenue: z.coerce.number(),
  }),
  byNeighborhood: namedValues,
  byCity: namedValues,
});

const daySchema = z.object({ date: z.string(), label: z.string(), total: z.number() });

const performanceSchema = z.object({
  days: z.array(daySchema),
  totalOrders: z.number(),
  avgDeliveryMinutes: z.number().nullish(),
  peakDay: daySchema.nullish(),
});

const rankingSchema = z.object({
  items: z.array(
    z.object({
      deliverymanId: z.number(),
      deliverymanName: z.string(),
      totalDeliveries: z.coerce.number(),
    }),
  ),
  page: z.number(),
  totalPages: z.number(),
  totalDeliveries: z.coerce.number(),
});

const rangeQuery = ({ start, end }: DateRange) => ({
  startDate: start.toISOString(),
  endDate: end.toISOString(),
});

export class HttpReportsRepository implements ReportsRepository {
  constructor(private readonly http: HttpClient) {}

  async dashboard(range: DateRange, signal?: AbortSignal): Promise<DashboardReport> {
    const data = await this.http.request({
      method: "GET",
      path: "/dashboard/reports",
      query: rangeQuery(range),
      signal,
    });
    const { summary, byNeighborhood, byCity } = parseResponse(reportSchema, data);
    return { ...summary, byNeighborhood, byCity };
  }

  async performance(range: DateRange, signal?: AbortSignal): Promise<Performance> {
    const data = await this.http.request({
      method: "GET",
      path: "/dashboard/performance",
      query: rangeQuery(range),
      signal,
    });
    const parsed = parseResponse(performanceSchema, data);
    return {
      days: parsed.days,
      totalOrders: parsed.totalOrders,
      avgDeliveryMinutes: parsed.avgDeliveryMinutes ?? null,
      peakDay: parsed.peakDay ?? null,
    };
  }

  async ranking(
    filter: DateRange & { status: RankingStatus; page: number; pageSize: number },
    signal?: AbortSignal,
  ): Promise<RankingPage> {
    const data = await this.http.request({
      method: "GET",
      path: "/orderDelivery/ranking/deliveryman",
      query: {
        ...rangeQuery(filter),
        status: filter.status,
        page: filter.page,
        pageSize: filter.pageSize,
      },
      signal,
    });
    const parsed = parseResponse(rankingSchema, data);
    return {
      items: parsed.items.map((i) => ({
        deliverymanId: i.deliverymanId,
        name: i.deliverymanName,
        total: i.totalDeliveries,
      })),
      page: parsed.page,
      totalPages: parsed.totalPages,
      totalDeliveries: parsed.totalDeliveries,
    };
  }
}
