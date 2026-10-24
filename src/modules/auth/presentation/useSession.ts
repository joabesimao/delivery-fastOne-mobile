import { container } from "@/main/container";
import { useSyncExternalStore } from "react";
import type { SessionState } from "../data/SessionManager";
import type { Session } from "../domain/Session";

const { sessionManager } = container;

const subscribe = (listener: () => void) => sessionManager.subscribe(listener);
const getSnapshot = () => sessionManager.getState();

// No logout as telas autenticadas ainda renderizam uma vez antes do guard redirecionar;
// elas recebem a última sessão válida em vez de quebrar.
let lastSession: Session | null = null;
const getSessionSnapshot = () => {
  const { session } = sessionManager.getState();
  if (session) lastSession = session;
  return lastSession;
};

export const useSessionState = (): SessionState => useSyncExternalStore(subscribe, getSnapshot);

export const useSession = (): Session => {
  const session = useSyncExternalStore(subscribe, getSessionSnapshot);
  if (!session) throw new Error("useSession usado fora de uma rota autenticada.");
  return session;
};
