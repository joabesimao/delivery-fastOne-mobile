import { AppError } from "@/core/errors/AppError";
import type { AuthTokens, Session } from "../domain/Session";
import type { AuthGateway, Credentials, SessionStore } from "./protocols";
import { SessionManager } from "./SessionManager";

const session: Session = {
  accessToken: "access-1",
  refreshToken: "refresh-1",
  name: "Ana Souza",
  role: "entregador",
};

const makeSut = (stored: Session | null = session) => {
  const gateway: jest.Mocked<AuthGateway> = {
    login: jest.fn(async (_credentials: Credentials) => session),
    refresh: jest.fn(async (_refreshToken: string): Promise<AuthTokens> => ({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    })),
    logout: jest.fn(async (_accessToken: string) => undefined),
  };
  const store: jest.Mocked<SessionStore> = {
    load: jest.fn(async () => stored),
    save: jest.fn(async (_session: Session) => undefined),
    clear: jest.fn(async () => undefined),
  };
  const sut = new SessionManager(gateway, store);
  return { sut, gateway, store };
};

describe("SessionManager", () => {
  it("restaura a sessão salva sem ir à rede", async () => {
    const { sut, gateway } = makeSut();
    await sut.restore();

    expect(sut.getState()).toMatchObject({ status: "signedIn", session });
    expect(gateway.refresh).not.toHaveBeenCalled();
  });

  it("restaura como deslogado quando não há sessão", async () => {
    const { sut } = makeSut(null);
    await sut.restore();
    expect(sut.getState().status).toBe("signedOut");
  });

  it("no login persiste a sessão e avisa os ouvintes", async () => {
    const { sut, store } = makeSut(null);
    const listener = jest.fn();
    sut.subscribe(listener);

    await sut.login({ email: "ana@x.com", password: "123" });

    expect(store.save).toHaveBeenCalledWith(session);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ status: "signedIn" }));
  });

  it("faz um único refresh para vários 401 simultâneos", async () => {
    const { sut, gateway } = makeSut();
    await sut.restore();

    const results = await Promise.all([
      sut.refreshAccessToken("access-1"),
      sut.refreshAccessToken("access-1"),
      sut.refreshAccessToken("access-1"),
    ]);

    expect(gateway.refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual(["access-2", "access-2", "access-2"]);
    expect(sut.getState().session?.refreshToken).toBe("refresh-2");
  });

  it("devolve o token atual quando outra requisição já renovou", async () => {
    const { sut, gateway } = makeSut();
    await sut.restore();
    await sut.refreshAccessToken("access-1");

    await expect(sut.refreshAccessToken("access-1")).resolves.toBe("access-2");
    expect(gateway.refresh).toHaveBeenCalledTimes(1);
  });

  it("mantém o refresh token atual quando o backend devolve só o access (janela de tolerância)", async () => {
    const { sut, gateway, store } = makeSut();
    gateway.refresh.mockResolvedValueOnce({ accessToken: "access-2" });
    await sut.restore();

    await sut.refreshAccessToken("access-1");

    expect(store.save).toHaveBeenCalledWith({ ...session, accessToken: "access-2" });
  });

  it("encerra a sessão como expirada quando o refresh é recusado", async () => {
    const { sut, gateway, store } = makeSut();
    gateway.refresh.mockRejectedValueOnce(new AppError("unauthorized", undefined, { status: 401 }));
    await sut.restore();

    await expect(sut.refreshAccessToken("access-1")).resolves.toBeNull();
    expect(store.clear).toHaveBeenCalled();
    expect(sut.getState()).toMatchObject({ status: "signedOut", signOutReason: "expired" });
  });

  it("não desloga por falha de rede no refresh", async () => {
    const { sut, gateway, store } = makeSut();
    gateway.refresh.mockRejectedValueOnce(new AppError("network"));
    await sut.restore();

    await expect(sut.refreshAccessToken("access-1")).rejects.toMatchObject({ kind: "network" });
    expect(store.clear).not.toHaveBeenCalled();
    expect(sut.getState().status).toBe("signedIn");
  });

  it("libera um novo refresh depois que o anterior falhou", async () => {
    const { sut, gateway } = makeSut();
    gateway.refresh.mockRejectedValueOnce(new AppError("network"));
    await sut.restore();

    await expect(sut.refreshAccessToken("access-1")).rejects.toBeInstanceOf(AppError);
    await expect(sut.refreshAccessToken("access-1")).resolves.toBe("access-2");
  });

  it("faz logout local mesmo se a revogação no servidor falhar", async () => {
    const { sut, gateway, store } = makeSut();
    gateway.logout.mockRejectedValueOnce(new AppError("network"));
    await sut.restore();

    await sut.logout();

    expect(gateway.logout).toHaveBeenCalledWith("access-1");
    expect(store.clear).toHaveBeenCalled();
    expect(sut.getState()).toMatchObject({ status: "signedOut", signOutReason: "user" });
    expect(sut.getAccessToken()).toBeNull();
  });

  it("sem sessão, refresh devolve null sem chamar a API", async () => {
    const { sut, gateway } = makeSut(null);
    await sut.restore();
    await expect(sut.refreshAccessToken("qualquer")).resolves.toBeNull();
    expect(gateway.refresh).not.toHaveBeenCalled();
  });
});
