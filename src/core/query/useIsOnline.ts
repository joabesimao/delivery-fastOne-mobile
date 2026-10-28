import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => onlineManager.subscribe(listener);

export const useIsOnline = () => useSyncExternalStore(subscribe, () => onlineManager.isOnline());
