export type AppErrorKind =
  | "network"
  | "timeout"
  | "aborted"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "rate_limited"
  | "server"
  | "invalid_response"
  | "unknown";

const defaultMessages: Record<AppErrorKind, string> = {
  network: "Sem conexão com o servidor. Verifique sua internet.",
  timeout: "O servidor demorou para responder. Tente novamente.",
  aborted: "Requisição cancelada.",
  bad_request: "Dados inválidos.",
  unauthorized: "Sua sessão expirou. Entre novamente.",
  forbidden: "Você não tem permissão para esta ação.",
  not_found: "Registro não encontrado.",
  conflict: "Este registro foi alterado por outra pessoa. Atualize e tente de novo.",
  payload_too_large: "Arquivo muito grande.",
  rate_limited: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  server: "Erro no servidor. Tente novamente em instantes.",
  invalid_response: "Resposta inesperada do servidor.",
  unknown: "Ocorreu um erro inesperado. Tente novamente.",
};

const kindByStatus: Record<number, AppErrorKind> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  422: "bad_request",
  429: "rate_limited",
};

interface AppErrorOptions {
  status?: number;
  retryAfterMs?: number;
  cause?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly retryAfterMs?: number;
  override readonly cause?: unknown;

  constructor(kind: AppErrorKind, message?: string, options: AppErrorOptions = {}) {
    super(message || defaultMessages[kind]);
    this.name = "AppError";
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    this.cause = options.cause;
  }

  static fromStatus(
    status: number,
    message?: string,
    options: Omit<AppErrorOptions, "status"> = {},
  ): AppError {
    const kind = kindByStatus[status] ?? (status >= 500 ? "server" : "unknown");
    return new AppError(kind, message, { ...options, status });
  }

  get isTransient(): boolean {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      this.kind === "rate_limited" ||
      (this.kind === "server" && this.status !== 501)
    );
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) return error;
  return new AppError("unknown", undefined, { cause: error });
};
