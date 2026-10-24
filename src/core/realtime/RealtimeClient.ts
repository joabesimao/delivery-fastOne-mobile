import { io, type Socket } from "socket.io-client";

export type RealtimeStatus = "disconnected" | "connecting" | "connected";

type Handler = Parameters<Socket["on"]>[1];

export interface RealtimeClientOptions {
  url: string;
  getToken: () => string | null;
  // Chamado quando o servidor recusa o handshake (token expirado). Deve renovar o token.
  onAuthRejected?: () => Promise<boolean>;
  ackTimeoutMs?: number;
  createSocket?: typeof io;
}

const AUTH_RETRY_DELAY_MS = 10_000;

export class RealtimeClient {
  private socket: Socket | null = null;
  private status: RealtimeStatus = "disconnected";
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly statusListeners = new Set<(status: RealtimeStatus) => void>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    if (this.socket) return;
    const createSocket = this.options.createSocket ?? io;

    const socket = createSocket(this.options.url, {
      path: "/socket.io",
      transports: ["websocket"],
      // Lido a cada (re)conexão, então a reconexão usa o token renovado.
      auth: (cb) => cb({ token: this.options.getToken() }),
    });

    socket.on("connect", () => this.setStatus("connected"));
    socket.on("disconnect", () => this.setStatus("connecting"));
    socket.io.on("reconnect_attempt", () => this.setStatus("connecting"));
    socket.on("connect_error", () => {
      // socket.active = false: o servidor recusou (auth). Sem isso não há nova tentativa automática.
      if (socket.active) return;
      this.setStatus("disconnected");
      void this.recoverFromAuthError(socket);
    });

    this.handlers.forEach((set, event) => set.forEach((handler) => socket.on(event, handler)));
    this.socket = socket;
    this.setStatus("connecting");
  }

  disconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus("disconnected");
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler as Handler);
    this.handlers.set(event, set);
    this.socket?.on(event, handler);

    return () => {
      set.delete(handler as Handler);
      this.socket?.off(event, handler);
    };
  }

  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  emitWithAck<T>(event: string, payload?: unknown): Promise<T> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.reject(new Error("Sem conexão em tempo real."));
    return socket.timeout(this.options.ackTimeoutMs ?? 10_000).emitWithAck(event, payload);
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  onStatusChange(listener: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private async recoverFromAuthError(socket: Socket): Promise<void> {
    let renewed = false;
    try {
      renewed = (await this.options.onAuthRejected?.()) ?? false;
    } catch {
      renewed = false;
    }
    if (this.socket !== socket) return;

    const delay = renewed ? 0 : AUTH_RETRY_DELAY_MS;
    this.retryTimer = setTimeout(() => {
      if (this.socket === socket && !socket.connected) {
        this.setStatus("connecting");
        socket.connect();
      }
    }, delay);
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
