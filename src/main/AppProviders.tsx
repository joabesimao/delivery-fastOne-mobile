import { bindQueryManagers } from "@/core/query/queryClient";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { z } from "zod";
import { container } from "./container";
import { queryKeys } from "./queryKeys";
import { setRealtimeAccount } from "./realtimeSession";

const { queryClient, realtime, sessionManager } = container;

const sessionReadySchema = z.object({
  account: z.object({ id: z.number(), name: z.string(), unitStoreId: z.number().nullish() }),
});

const unreadSchema = z.object({ unreadCount: z.number() });

// Tempo real só invalida o cache; quem está na tela refaz a busca, o resto fica para quando abrir.
const bindRealtimeToCache = (client: QueryClient) => {
  const invalidateLive = () => {
    void client.invalidateQueries({ queryKey: queryKeys.deliveries });
    void client.invalidateQueries({ queryKey: queryKeys.notifications });
    void client.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const onUnread = (payload: unknown) => {
    const parsed = unreadSchema.safeParse(payload);
    if (parsed.success) client.setQueryData(queryKeys.unreadCount, parsed.data.unreadCount);
    void client.invalidateQueries({ queryKey: queryKeys.notificationList });
  };

  const unsubscribers = [
    realtime.on("session:ready", (payload: unknown) => {
      const parsed = sessionReadySchema.safeParse(payload);
      if (parsed.success) {
        const { id, name, unitStoreId } = parsed.data.account;
        setRealtimeAccount({ id, name, unitStoreId: unitStoreId ?? null });
      }
    }),
    realtime.on("delivery:changed", () => {
      void client.invalidateQueries({ queryKey: queryKeys.deliveries });
      void client.invalidateQueries({ queryKey: ["dashboard"] });
    }),
    realtime.on("notification:new", onUnread),
    realtime.on("notification:read", onUnread),
    realtime.on("notification:deleted", onUnread),
  ];

  // Ao reconectar, o que mudou durante a queda não chegou por evento.
  let wasConnected = false;
  const unsubscribeStatus = realtime.onStatusChange((status) => {
    if (status === "connected" && wasConnected) invalidateLive();
    if (status === "connected") wasConnected = true;
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribeStatus();
  };
};

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => bindQueryManagers(), []);

  useEffect(() => bindRealtimeToCache(queryClient), []);

  useEffect(() => {
    const sync = () => {
      const { status } = sessionManager.getState();
      if (status === "signedIn") {
        realtime.connect();
      } else if (status === "signedOut") {
        // Ordem do plano: sessão já limpa → cache → socket.
        queryClient.clear();
        realtime.disconnect();
        setRealtimeAccount(null);
      }
    };
    sync();
    const unsubscribe = sessionManager.subscribe(sync);
    void sessionManager.restore();
    return unsubscribe;
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
