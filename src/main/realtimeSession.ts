import { useSyncExternalStore } from "react";
import { container } from "./container";

export interface RealtimeAccount {
  id: number;
  name: string;
  unitStoreId: number | null;
}

// `session:ready` só chega na conexão; guardado aqui para telas que montam depois.
let account: RealtimeAccount | null = null;
const listeners = new Set<() => void>();

export const setRealtimeAccount = (next: RealtimeAccount | null) => {
  account = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useRealtimeAccount = () => useSyncExternalStore(subscribe, () => account);

const subscribeStatus = (listener: () => void) => container.realtime.onStatusChange(listener);

export const useRealtimeStatus = () =>
  useSyncExternalStore(subscribeStatus, () => container.realtime.getStatus());
