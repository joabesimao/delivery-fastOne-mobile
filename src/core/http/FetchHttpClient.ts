import { AppError, isAppError, toAppError } from "../errors/AppError";
import type { AccessTokenProvider, HttpClient, HttpRequest, QueryValue } from "./HttpClient";
import {
  computeDelay,
  defaultRetryPolicy,
  isIdempotent,
  parseRetryAfter,
  shouldRetry,
  type RetryPolicy,
} from "./retryPolicy";

type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

export interface FetchHttpClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  tokenProvider?: AccessTokenProvider;
  defaultHeaders?: Record<string, string>;
  fetchFn?: typeof fetch;
  sleep?: Sleep;
  random?: () => number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const abortableSleep: Sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError("aborted"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AppError("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const isFormData = (body: unknown): body is FormData =>
  typeof FormData !== "undefined" && body instanceof FormData;

const buildQuery = (query?: Record<string, QueryValue>): string => {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

const extractMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const { error, message } = data as { error?: unknown; message?: unknown };
  if (typeof error === "string" && error.trim()) return error;
  if (typeof message === "string" && message.trim()) return message;
  return undefined;
};

export class FetchHttpClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;
  private readonly tokenProvider?: AccessTokenProvider;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: Sleep;
  private readonly random: () => number;

  constructor(options: FetchHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryPolicy = options.retryPolicy ?? defaultRetryPolicy;
    this.tokenProvider = options.tokenProvider;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
    this.sleep = options.sleep ?? abortableSleep;
    this.random = options.random ?? Math.random;
  }

  async request<T>(request: HttpRequest): Promise<T> {
    const idempotent = isIdempotent(request.method, request.idempotent);

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sendWithAuth<T>(request);
      } catch (error) {
        const appError = toAppError(error);
        if (!shouldRetry(appError, attempt, idempotent, this.retryPolicy)) throw appError;
        await this.sleep(
          computeDelay(appError, attempt, this.retryPolicy, this.random),
          request.signal,
        );
      }
    }
  }

  private async sendWithAuth<T>(request: HttpRequest): Promise<T> {
    const provider = request.authenticated === false ? undefined : this.tokenProvider;
    const token = provider?.getAccessToken() ?? null;

    try {
      return await this.send<T>(request, token);
    } catch (error) {
      if (!provider || !token || !isAppError(error) || error.kind !== "unauthorized") throw error;
      const renewed = await provider.refreshAccessToken(token);
      if (!renewed) throw error;
      return await this.send<T>(request, renewed);
    }
  }

  private async send<T>(request: HttpRequest, token: string | null): Promise<T> {
    if (request.signal?.aborted) throw new AppError("aborted");

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, request.timeoutMs ?? this.timeoutMs);
    const forwardAbort = () => controller.abort();
    request.signal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      const response = await this.fetchFn(
        `${this.baseUrl}${request.path}${buildQuery(request.query)}`,
        {
          method: request.method,
          headers: this.buildHeaders(request, token),
          body: this.buildBody(request.body),
          signal: controller.signal,
        },
      );
      return await this.parse<T>(response);
    } catch (error) {
      if (isAppError(error)) throw error;
      if (timedOut) throw new AppError("timeout", undefined, { cause: error });
      if (request.signal?.aborted) throw new AppError("aborted", undefined, { cause: error });
      throw new AppError("network", undefined, { cause: error });
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", forwardAbort);
    }
  }

  private buildHeaders(request: HttpRequest, token: string | null): Record<string, string> {
    return {
      Accept: "application/json",
      ...(request.body !== undefined && !isFormData(request.body)
        ? { "Content-Type": "application/json" }
        : {}),
      ...this.defaultHeaders,
      ...(token ? { "x-access-token": token } : {}),
      ...request.headers,
    };
  }

  private buildBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined;
    if (isFormData(body)) return body;
    return JSON.stringify(body);
  }

  private async parse<T>(response: Response): Promise<T> {
    const raw = response.status === 204 ? "" : await response.text();
    let data: unknown = undefined;

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (cause) {
        if (response.ok) throw new AppError("invalid_response", undefined, { cause });
      }
    }

    if (!response.ok) {
      throw AppError.fromStatus(response.status, extractMessage(data), {
        retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
      });
    }

    return data as T;
  }
}
