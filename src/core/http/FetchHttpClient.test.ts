import { AppError } from "../errors/AppError";
import { FetchHttpClient, type FetchHttpClientOptions } from "./FetchHttpClient";
import type { AccessTokenProvider } from "./HttpClient";

const jsonResponse = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const makeSut = (overrides: Partial<FetchHttpClientOptions> = {}) => {
  const fetchFn = jest.fn() as jest.MockedFunction<typeof fetch>;
  const sleep = jest.fn().mockResolvedValue(undefined);
  const client = new FetchHttpClient({
    baseUrl: "https://api.test/api/",
    fetchFn,
    sleep,
    random: () => 0.5,
    ...overrides,
  });
  return { client, fetchFn, sleep };
};

const makeTokenProvider = (token: string | null, renewed: string | null) => {
  const provider: jest.Mocked<AccessTokenProvider> = {
    getAccessToken: jest.fn(() => token),
    refreshAccessToken: jest.fn(async (_rejectedToken: string) => renewed),
  };
  return provider;
};

const lastInit = (fetchFn: jest.MockedFunction<typeof fetch>) =>
  fetchFn.mock.calls.at(-1)?.[1] as RequestInit;

describe("FetchHttpClient", () => {
  it("monta URL com query, ignorando valores vazios", async () => {
    const { client, fetchFn } = makeSut();
    fetchFn.mockResolvedValueOnce(jsonResponse(200, []));

    await client.request({
      method: "GET",
      path: "/orderDelivery",
      query: { status: "actived", page: 2, q: "", from: undefined, to: null },
    });

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/orderDelivery?status=actived&page=2",
    );
  });

  it("serializa JSON e envia o token no header x-access-token", async () => {
    const provider = makeTokenProvider("access-1", null);
    const { client, fetchFn } = makeSut({ tokenProvider: provider });
    fetchFn.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    const result = await client.request<{ id: number }>({
      method: "POST",
      path: "/vehicle",
      body: { plate: "ABC" },
    });

    expect(result).toEqual({ id: 1 });
    const init = lastInit(fetchFn);
    expect(init.body).toBe('{"plate":"ABC"}');
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-access-token": "access-1",
    });
  });

  it("não força Content-Type quando o corpo é FormData", async () => {
    const { client, fetchFn } = makeSut();
    fetchFn.mockResolvedValueOnce(jsonResponse(204));
    const form = new FormData();

    await client.request({ method: "POST", path: "/upload", body: form });

    const init = lastInit(fetchFn);
    expect(init.body).toBe(form);
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("não envia token em requisição pública", async () => {
    const provider = makeTokenProvider("access-1", null);
    const { client, fetchFn } = makeSut({ tokenProvider: provider });
    fetchFn.mockResolvedValueOnce(jsonResponse(200, {}));

    await client.request({ method: "POST", path: "/login", body: {}, authenticated: false });

    expect(lastInit(fetchFn).headers).not.toHaveProperty("x-access-token");
  });

  it("devolve undefined em 204", async () => {
    const { client, fetchFn } = makeSut();
    fetchFn.mockResolvedValueOnce(jsonResponse(204));

    await expect(client.request({ method: "DELETE", path: "/x/1" })).resolves.toBeUndefined();
  });

  it("converte o corpo { error } da API em AppError tipado", async () => {
    const { client, fetchFn } = makeSut();
    fetchFn.mockResolvedValueOnce(jsonResponse(409, { error: "Pedido já finalizado" }));

    await expect(client.request({ method: "POST", path: "/x" })).rejects.toMatchObject({
      kind: "conflict",
      status: 409,
      message: "Pedido já finalizado",
    });
  });

  it("falha com invalid_response quando 2xx não é JSON", async () => {
    const { client, fetchFn } = makeSut();
    fetchFn.mockResolvedValueOnce(new Response("<html>", { status: 200 }));

    await expect(client.request({ method: "GET", path: "/x" })).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  describe("retry", () => {
    it("repete GET em 503 com backoff exponencial e jitter", async () => {
      const { client, fetchFn, sleep } = makeSut();
      fetchFn
        .mockResolvedValueOnce(jsonResponse(503))
        .mockResolvedValueOnce(jsonResponse(503))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

      await expect(client.request({ method: "GET", path: "/x" })).resolves.toEqual({ ok: true });
      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([150, 300]);
    });

    it("desiste após o máximo de tentativas", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn.mockResolvedValue(jsonResponse(500));

      await expect(client.request({ method: "GET", path: "/x" })).rejects.toMatchObject({
        kind: "server",
      });
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it("não repete POST (não idempotente) mesmo com erro de rede", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn.mockRejectedValue(new TypeError("Network request failed"));

      await expect(client.request({ method: "POST", path: "/x" })).rejects.toMatchObject({
        kind: "network",
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("repete POST marcado como idempotente", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn
        .mockRejectedValueOnce(new TypeError("Network request failed"))
        .mockResolvedValueOnce(jsonResponse(200, {}));

      await client.request({ method: "POST", path: "/push-tokens", idempotent: true });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("respeita Retry-After do 429", async () => {
      const { client, fetchFn, sleep } = makeSut();
      fetchFn
        .mockResolvedValueOnce(jsonResponse(429, { error: "Muitas" }, { "Retry-After": "2" }))
        .mockResolvedValueOnce(jsonResponse(200, {}));

      await client.request({ method: "GET", path: "/x" });
      expect(sleep).toHaveBeenCalledWith(2000, undefined);
    });

    it("não espera quando o Retry-After passa do limite", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn.mockResolvedValueOnce(jsonResponse(429, {}, { "Retry-After": "900" }));

      await expect(client.request({ method: "GET", path: "/x" })).rejects.toMatchObject({
        kind: "rate_limited",
        retryAfterMs: 900_000,
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("não repete erros de cliente (4xx)", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn.mockResolvedValue(jsonResponse(404));

      await expect(client.request({ method: "GET", path: "/x" })).rejects.toMatchObject({
        kind: "not_found",
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("timeout e cancelamento", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const hangingFetch = (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });

    it("aborta e devolve timeout quando o servidor não responde", async () => {
      const { client, fetchFn } = makeSut({
        timeoutMs: 1000,
        retryPolicy: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
      });
      fetchFn.mockImplementation(hangingFetch);

      const pending = client.request({ method: "GET", path: "/x" });
      jest.advanceTimersByTime(1000);

      await expect(pending).rejects.toMatchObject({ kind: "timeout" });
    });

    it("propaga o cancelamento do chamador sem retry", async () => {
      const { client, fetchFn } = makeSut();
      fetchFn.mockImplementation(hangingFetch);
      const controller = new AbortController();

      const pending = client.request({ method: "GET", path: "/x", signal: controller.signal });
      controller.abort();

      await expect(pending).rejects.toMatchObject({ kind: "aborted" });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("renovação de token", () => {
    it("em 401 renova o token e repete a requisição uma vez", async () => {
      const provider = makeTokenProvider("old", "new");
      const { client, fetchFn } = makeSut({ tokenProvider: provider });
      fetchFn
        .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" }))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

      await expect(client.request({ method: "GET", path: "/x" })).resolves.toEqual({ ok: true });
      expect(provider.refreshAccessToken).toHaveBeenCalledWith("old");
      expect(lastInit(fetchFn).headers).toMatchObject({ "x-access-token": "new" });
    });

    it("propaga 401 quando não consegue renovar", async () => {
      const provider = makeTokenProvider("old", null);
      const { client, fetchFn } = makeSut({ tokenProvider: provider });
      fetchFn.mockResolvedValue(jsonResponse(401));

      await expect(client.request({ method: "GET", path: "/x" })).rejects.toBeInstanceOf(AppError);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("não tenta renovar quando não havia token", async () => {
      const provider = makeTokenProvider(null, "new");
      const { client, fetchFn } = makeSut({ tokenProvider: provider });
      fetchFn.mockResolvedValue(jsonResponse(401));

      await expect(client.request({ method: "GET", path: "/x" })).rejects.toMatchObject({
        kind: "unauthorized",
      });
      expect(provider.refreshAccessToken).not.toHaveBeenCalled();
    });
  });
});
