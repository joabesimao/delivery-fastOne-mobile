export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  authenticated?: boolean;
  idempotent?: boolean;
}

export interface HttpClient {
  request<T>(request: HttpRequest): Promise<T>;
}

export interface AccessTokenProvider {
  getAccessToken(): string | null;
  refreshAccessToken(rejectedToken: string): Promise<string | null>;
}
