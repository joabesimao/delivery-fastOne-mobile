import type { AuthTokens, Session } from "../domain/Session";

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthGateway {
  login(credentials: Credentials): Promise<Session>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(accessToken: string): Promise<void>;
}

export interface SessionStore {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}
