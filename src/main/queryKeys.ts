import type { OverviewPeriod } from "@/modules/dashboard/domain/Overview";

// Chaves hierárquicas: invalidar ["deliveries"] atualiza a lista e todos os detalhes.
export const queryKeys = {
  deliveries: ["deliveries"] as const,
  deliveryList: ["deliveries", "list"] as const,
  delivery: (id: number) => ["deliveries", "detail", id] as const,
  deliverymen: ["deliverymen"] as const,
  fleet: ["fleet"] as const,
  vehicles: ["fleet", "vehicles"] as const,
  myVehicleId: ["fleet", "my-vehicle"] as const,
  fuelRefills: (vehicleId: number) => ["fleet", "fuel-refills", vehicleId] as const,
  oilChanges: (vehicleId: number) => ["fleet", "oil-changes", vehicleId] as const,
  notifications: ["notifications"] as const,
  notificationList: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  overview: (period: OverviewPeriod) => ["dashboard", "overview", period] as const,
};
