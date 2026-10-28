import { isAppError } from "@/core/errors/AppError";
import type { AccessTokenProvider } from "@/core/http/HttpClient";
import type { Session, SessionStatus, SignOutReason } from "../domain/Session";
import type { AuthGateway, Credentials, SessionStore } from "./protocols";

export interface SessionState {
  status: SessionStatus;
  session: Session | null;
  signOutReason: SignOutReason | null;
}

type Listener = (state: SessionState) => void;

export class SessionManager implements AccessTokenProvider {
  private state: SessionState = { status: "restoring", session: null, signOutReason: null };
  private refreshing: Promise<string | null> | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly gateway: AuthGateway,
    private readonly store: SessionStore,
  ) {}

  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Restaura sem ir à rede: o app abre offline e o token é validado na primeira requisição.
  async restore(): Promise<void> {
    const session = await this.store.load().catch(() => null);
    this.setState(
      session
        ? { status: "signedIn", session, signOutReason: null }
        : { status: "signedOut", session: null, signOutReason: null },
    );
  }

  async login(credentials: Credentials): Promise<Session> {
    const session = await this.gateway.login(credentials);
    await this.store.save(session);
    this.setState({ status: "signedIn", session, signOutReason: null });
    return session;
  }

  async logout(): Promise<void> {
    const token = this.state.session?.accessToken;
    // Revogar no servidor é "melhor esforço": sem rede, o logout local acontece mesmo assim.
    if (token) await this.gateway.logout(token).catch(() => undefined);
    await this.endSession("user");
  }

  getAccessToken(): string | null {
    return this.state.session?.accessToken ?? null;
  }

  // Single-flight: várias requisições com 401 ao mesmo tempo disparam um único refresh.
  refreshAccessToken(rejectedToken: string): Promise<string | null> {
    const current = this.state.session;
    if (!current) return Promise.resolve(null);
    // Outra requisição já renovou enquanto esta estava em voo.
    if (current.accessToken !== rejectedToken) return Promise.resolve(current.accessToken);

    this.refreshing ??= this.doRefresh(current).finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(current: Session): Promise<string | null> {
    try {
      const tokens = await this.gateway.refresh(current.refreshToken);
      if (this.state.session !== current) return this.getAccessToken();

      const session: Session = {
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? current.refreshToken,
      };
      await this.store.save(session);
      this.setState({ status: "signedIn", session, signOutReason: null });
      return session.accessToken;
    } catch (error) {
      // Falha de rede/servidor não derruba a sessão; só refresh recusado pelo backend.
      if (isAppError(error) && (error.kind === "unauthorized" || error.kind === "bad_request")) {
        await this.endSession("expired");
        return null;
      }
      throw error;
    }
  }

  private async endSession(reason: SignOutReason): Promise<void> {
    await this.store.clear().catch(() => undefined);
    this.setState({ status: "signedOut", session: null, signOutReason: reason });
  }

  private setState(state: SessionState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
