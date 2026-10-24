import type { OverviewPeriod } from "@/modules/dashboard/domain/Overview";
import type { FleetFilter } from "@/modules/fleet/domain/Fleet";

// Chaves hierárquicas: invalidar ["deliveries"] atualiza a lista e todos os detalhes.
export const queryKeys = {
  deliveries: ["deliveries"] as const,
  deliveryList: ["deliveries", "list"] as const,
  delivery: (id: number) => ["deliveries", "detail", id] as const,
  deliverymen: ["deliverymen"] as const,
  fleet: ["fleet"] as const,
  vehicles: ["fleet", "vehicles"] as const,
  myVehicleId: ["fleet", "my-vehicle"] as const,
  fuelRefills: (filter: FleetFilter) => ["fleet", "fuel-refills", filter] as const,
  oilChanges: (filter: FleetFilter) => ["fleet", "oil-changes", filter] as const,
  oilChangeInterval: ["fleet", "oil-change-interval"] as const,
  notifications: ["notifications"] as const,
  notificationList: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  overview: (period: OverviewPeriod) => ["dashboard", "overview", period] as const,
  performance: (range: { start: string; end: string }) =>
    ["dashboard", "performance", range] as const,
  ranking: (range: { start: string; end: string }) => ["dashboard", "ranking", range] as const,
  dashboardReport: (range: { start: string; end: string }) =>
    ["dashboard", "reports", range] as const,
  // Cadastros: invalidar ["catalog"] atualiza todas as listas.
  catalog: ["catalog"] as const,
  cities: ["catalog", "cities"] as const,
  neighborhoods: ["catalog", "neighborhoods"] as const,
  clients: ["catalog", "clients"] as const,
  registers: ["catalog", "registers"] as const,
  catalogDeliverymen: ["catalog", "deliverymen"] as const,
  products: ["catalog", "products"] as const,
  accounts: ["accounts"] as const,
  search: (term: string) => ["search", term] as const,
  chatSearch: (term: string) => ["chat-search", term] as const,
};
