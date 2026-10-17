import { AppError } from "../errors/AppError";
import { computeDelay, defaultRetryPolicy, parseRetryAfter, shouldRetry } from "./retryPolicy";

describe("retryPolicy", () => {
  it("limita o backoff ao maxDelayMs", () => {
    const error = new AppError("network");
    expect(computeDelay(error, 10, defaultRetryPolicy, () => 1)).toBe(
      defaultRetryPolicy.maxDelayMs,
    );
  });

  it("usa jitter completo entre 0 e o teto", () => {
    const error = new AppError("server", undefined, { status: 503 });
    expect(computeDelay(error, 1, defaultRetryPolicy, () => 0)).toBe(0);
    expect(computeDelay(error, 1, defaultRetryPolicy, () => 0.5)).toBe(300);
  });

  it("não repete 501 nem erros de validação", () => {
    expect(shouldRetry(AppError.fromStatus(501), 0, true, defaultRetryPolicy)).toBe(false);
    expect(shouldRetry(AppError.fromStatus(400), 0, true, defaultRetryPolicy)).toBe(false);
    expect(shouldRetry(AppError.fromStatus(502), 0, true, defaultRetryPolicy)).toBe(true);
  });

  it("interpreta Retry-After em segundos e em data HTTP", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(parseRetryAfter("3", now)).toBe(3000);
    expect(parseRetryAfter("Sat, 17 Oct 2026 12:00:10 GMT", now)).toBe(10_000);
    expect(parseRetryAfter("lixo", now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });
});
