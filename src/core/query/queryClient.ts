import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { toAppError } from "../errors/AppError";

const MAX_QUERY_RETRIES = 2;

// O FetchHttpClient já repete falhas transitórias; aqui só cobre o que escapou (ex.: queda longa).
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean =>
  failureCount < MAX_QUERY_RETRIES && toAppError(error).isTransient;

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
      mutations: { retry: false },
    },
  });

// Sem isso o react-query não sabe quando o app volta ao primeiro plano nem quando a rede volta.
export const bindQueryManagers = (): (() => void) => {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
    }),
  );

  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== "web") focusManager.setFocused(status === "active");
  };
  const appStateSubscription = AppState.addEventListener("change", onAppStateChange);

  return () => appStateSubscription.remove();
};
