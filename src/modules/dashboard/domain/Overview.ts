import type { DeliveryStatus } from "@/modules/deliveries/domain/Delivery";

export interface OverviewMetrics {
  clients: number;
  deliverymen: number;
  activeDeliveries: number;
  deliveredRevenue: number;
  deliveredRevenuePreviousPeriod: number | null;
}

export interface LatestDelivery {
  id: number;
  status: DeliveryStatus;
  amount: number;
  clientName: string;
  deliverymanName: string;
}

export interface Overview {
  metrics: OverviewMetrics;
  latestDeliveries: LatestDelivery[];
}

export type OverviewPeriod = "today" | "7d" | "30d";

export interface OverviewRepository {
  load(range: { start: Date; end: Date }, signal?: AbortSignal): Promise<Overview>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const periodRange = (period: OverviewPeriod, now: Date = new Date()) => {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = { today: 0, "7d": 6, "30d": 29 }[period];
  return { start: new Date(startOfToday.getTime() - days * DAY_MS), end: now };
};

// Variação da receita contra o período anterior de mesmo tamanho (null quando não há base).
export const revenueTrend = ({
  deliveredRevenue,
  deliveredRevenuePreviousPeriod,
}: OverviewMetrics) => {
  if (!deliveredRevenuePreviousPeriod) return null;
  return (deliveredRevenue - deliveredRevenuePreviousPeriod) / deliveredRevenuePreviousPeriod;
};
