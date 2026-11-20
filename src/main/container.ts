import { FetchHttpClient } from "@/core/http/FetchHttpClient";
import { createQueryClient } from "@/core/query/queryClient";
import { RealtimeClient } from "@/core/realtime/RealtimeClient";
import { secureStorage } from "@/core/storage/secureStorage";
import { SessionManager } from "@/modules/auth/data/SessionManager";
import { HttpAuthGateway } from "@/modules/auth/infra/HttpAuthGateway";
import { StorageSessionStore } from "@/modules/auth/infra/StorageSessionStore";
import { HttpOverviewRepository } from "@/modules/dashboard/infra/HttpOverviewRepository";
import { HttpDeliveryRepository } from "@/modules/deliveries/infra/HttpDeliveryRepository";
import {
  HttpFleetRepository,
  StorageVehiclePreference,
} from "@/modules/fleet/infra/HttpFleetRepository";
import { HttpNotificationRepository } from "@/modules/notifications/infra/HttpNotificationRepository";
import { HttpCatalogRepository } from "@/modules/catalog/infra/HttpCatalogRepository";
import { HttpReportsRepository } from "@/modules/reports/infra/HttpReportsRepository";
import { HttpSearchRepository } from "@/modules/search/infra/HttpSearchRepository";
import { HttpAccountRepository } from "@/modules/users/infra/HttpAccountRepository";
import { env } from "./env";

let sessionManager: SessionManager;

const http = new FetchHttpClient({
  baseUrl: env.apiUrl,
  tokenProvider: {
    getAccessToken: () => sessionManager.getAccessToken(),
    refreshAccessToken: (rejected) => sessionManager.refreshAccessToken(rejected),
  },
});

sessionManager = new SessionManager(
  new HttpAuthGateway(http),
  new StorageSessionStore(secureStorage),
);

const SOCKET_REFRESH_COOLDOWN_MS = 30_000;
let lastSocketRefreshAt = 0;

const realtime = new RealtimeClient({
  url: env.socketUrl,
  getToken: () => sessionManager.getAccessToken(),
  onAuthRejected: async () => {
    const token = sessionManager.getAccessToken();
    const now = Date.now();
    if (!token || now - lastSocketRefreshAt < SOCKET_REFRESH_COOLDOWN_MS) return false;
    lastSocketRefreshAt = now;
    return Boolean(await sessionManager.refreshAccessToken(token));
  },
});

export const container = {
  env,
  http,
  sessionManager,
  realtime,
  queryClient: createQueryClient(),
  deliveries: new HttpDeliveryRepository(http),
  fleet: new HttpFleetRepository(http),
  vehiclePreference: new StorageVehiclePreference(secureStorage),
  notifications: new HttpNotificationRepository(http),
  overview: new HttpOverviewRepository(http),
  catalog: new HttpCatalogRepository(http),
  accounts: new HttpAccountRepository(http),
  reports: new HttpReportsRepository(http),
  search: new HttpSearchRepository(http),
};
