import {
  DELIVERY_STATUSES,
  statusLabels,
  type Delivery,
  type DeliveryStatus,
} from "@/modules/deliveries/domain/Delivery";

export interface NamedValue {
  name: string;
  value: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// /dashboard/reports
export interface DashboardReport {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  byNeighborhood: NamedValue[];
  byCity: NamedValue[];
}

// /dashboard/performance
export interface PerformanceDay {
  date: string;
  label: string;
  total: number;
}

export interface Performance {
  days: PerformanceDay[];
  totalOrders: number;
  avgDeliveryMinutes: number | null;
  peakDay: PerformanceDay | null;
}

export type RankingStatus = "all" | "delivered" | "finished";

export const rankingStatusLabels: Record<RankingStatus, string> = {
  all: "Todos",
  delivered: "Entregues",
  finished: "Finalizadas",
};

export interface RankingItem {
  deliverymanId: number;
  name: string;
  total: number;
}

export interface RankingPage {
  items: RankingItem[];
  page: number;
  totalPages: number;
  totalDeliveries: number;
}

export interface ReportsRepository {
  dashboard(range: DateRange, signal?: AbortSignal): Promise<DashboardReport>;
  performance(range: DateRange, signal?: AbortSignal): Promise<Performance>;
  ranking(
    filter: DateRange & { status: RankingStatus; page: number; pageSize: number },
    signal?: AbortSignal,
  ): Promise<RankingPage>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Dia inteiro: do início do primeiro dia ao fim do último (o filtro de data do web faz igual).
export const wholeDays = (a: Date, b: Date): DateRange => {
  const [first, last] = a <= b ? [a, b] : [b, a];
  return {
    start: new Date(first.getFullYear(), first.getMonth(), first.getDate()),
    end: new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999),
  };
};

export const lastDays = (days: number, now: Date = new Date()): DateRange =>
  wholeDays(new Date(now.getTime() - (days - 1) * DAY_MS), now);

export const rangeKey = ({ start, end }: DateRange) => ({
  start: start.toISOString(),
  end: end.toISOString(),
});

export const averageTicket = (revenue: number, count: number) => (count > 0 ? revenue / count : 0);

// Relatório de entregas: mesmos números da tela "Relatórios das Entregas" do web.
export interface DeliverymanStats {
  key: string;
  name: string;
  total: number;
  finished: number;
  open: number;
  revenue: number;
  completionRate: number;
}

export interface DeliveriesReport {
  totalOrders: number;
  finishedCount: number;
  totalRevenue: number;
  averageTicket: number;
  byStatus: NamedValue[];
  byNeighborhood: NamedValue[];
  topDeliverymen: DeliverymanStats[];
}

const byValueThenName = (a: NamedValue, b: NamedValue) =>
  b.value - a.value || a.name.localeCompare(b.name);

const countBy = (items: readonly Delivery[], key: (d: Delivery) => string): NamedValue[] => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].map(([name, value]) => ({ name, value })).sort(byValueThenName);
};

export const inRange = (deliveries: readonly Delivery[], { start, end }: DateRange) =>
  deliveries.filter((d) => d.date >= start && d.date <= end);

export const buildDeliveriesReport = (deliveries: readonly Delivery[]): DeliveriesReport => {
  const finished = deliveries.filter((d) => d.status === "finished");
  const totalRevenue = finished.reduce((sum, d) => sum + d.amount, 0);

  const statusCounts: Record<DeliveryStatus, number> = { actived: 0, delivered: 0, finished: 0 };
  for (const d of deliveries) statusCounts[d.status] += 1;

  const people = new Map<string, DeliverymanStats>();
  for (const d of deliveries) {
    const key = d.deliveryman ? `dm-${d.deliveryman.id}` : "none";
    const stats = people.get(key) ?? {
      key,
      name: d.deliveryman?.name ?? "Sem entregador",
      total: 0,
      finished: 0,
      open: 0,
      revenue: 0,
      completionRate: 0,
    };
    stats.total += 1;
    if (d.status === "finished") {
      stats.finished += 1;
      stats.revenue += d.amount;
    } else {
      stats.open += 1;
    }
    people.set(key, stats);
  }

  return {
    totalOrders: deliveries.length,
    finishedCount: finished.length,
    totalRevenue,
    averageTicket: averageTicket(totalRevenue, finished.length),
    byStatus: DELIVERY_STATUSES.map((s) => ({ name: statusLabels[s], value: statusCounts[s] })),
    byNeighborhood: countBy(deliveries, (d) => d.address.neighborhood.trim() || "Sem bairro"),
    topDeliverymen: [...people.values()]
      .map((s) => ({
        ...s,
        completionRate: s.total ? Math.round((s.finished / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total || b.revenue - a.revenue || a.name.localeCompare(b.name))
      .slice(0, 5),
  };
};
