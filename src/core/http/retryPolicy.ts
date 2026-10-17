import type { AppError } from "../errors/AppError";
import type { HttpMethod } from "./HttpClient";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
};

const idempotentMethods: ReadonlySet<HttpMethod> = new Set(["GET", "PUT", "DELETE"]);

export const isIdempotent = (method: HttpMethod, explicit?: boolean): boolean =>
  explicit ?? idempotentMethods.has(method);

export const shouldRetry = (
  error: AppError,
  attempt: number,
  idempotent: boolean,
  policy: RetryPolicy,
): boolean => {
  if (attempt >= policy.maxRetries || !idempotent || !error.isTransient) return false;
  if (error.retryAfterMs !== undefined && error.retryAfterMs > policy.maxDelayMs) return false;
  return true;
};

export const computeDelay = (
  error: AppError,
  attempt: number,
  policy: RetryPolicy,
  random: () => number = Math.random,
): number => {
  if (error.retryAfterMs !== undefined) return error.retryAfterMs;
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
  return Math.round(random() * ceiling);
};

export const parseRetryAfter = (
  value: string | null,
  now: number = Date.now(),
): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};
