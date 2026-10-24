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
import { HttpChatSearch } from "@/modules/chat/infra/HttpChatSearch";
import { HttpReportsRepository } from "@/modules/reports/infra/HttpReportsRepository";
import { HttpSearchRepository } from "@/modules/search/infra/HttpSearchRepository";
import { HttpAccountRepository } from "@/modules/users/infra/HttpAccountRepository";
import { env } from "./env";

// Único lugar que conhece as implementações concretas.

// http e sessão dependem um do outro (refresh usa o http; o http pede o token à sessão).
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

// Evita laço de refresh quando o socket é recusado por outro motivo (ex.: conta sem loja).
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
  chatSearch: new HttpChatSearch(http),
};
