import { AppError, toAppError, type AppErrorKind } from "@/core/errors/AppError";

// Nesses casos a mensagem do servidor é técnica ou inexistente: usa o texto padrão em português.
const ALWAYS_DEFAULT: ReadonlySet<AppErrorKind> = new Set([
  "network",
  "timeout",
  "aborted",
  "unauthorized",
  "rate_limited",
  "server",
  "invalid_response",
  "unknown",
]);

const GENERIC_SERVER_MESSAGES =
  /^(access denied|unauthorized|internal server error|erro desconhecido)$/i;

export const describeError = (
  error: unknown,
  overrides: Partial<Record<AppErrorKind, string>> = {},
) => {
  const appError = toAppError(error);
  const override = overrides[appError.kind];
  if (override) return override;

  const fallback = new AppError(appError.kind).message;
  if (ALWAYS_DEFAULT.has(appError.kind) || GENERIC_SERVER_MESSAGES.test(appError.message)) {
    return fallback;
  }
  return appError.message || fallback;
};
