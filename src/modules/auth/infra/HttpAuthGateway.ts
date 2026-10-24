import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { z } from "zod";
import type { AuthGateway, Credentials } from "../data/protocols";
import { ACCOUNT_ROLES, type AuthTokens, type Session } from "../domain/Session";

const loginSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  name: z.string(),
  role: z.enum(ACCOUNT_ROLES),
});

const refreshSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});

export class HttpAuthGateway implements AuthGateway {
  constructor(private readonly http: HttpClient) {}

  async login({ email, password }: Credentials): Promise<Session> {
    const data = await this.http.request({
      method: "POST",
      path: "/login",
      body: { email: email.trim().toLowerCase(), password },
      authenticated: false,
    });
    return parseResponse(loginSchema, data);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const data = await this.http.request({
      method: "POST",
      path: "/refresh-token",
      body: { refreshToken },
      authenticated: false,
    });
    return parseResponse(refreshSchema, data);
  }

  async logout(accessToken: string): Promise<void> {
    // Token explícito e sem refresh: um 401 aqui não deve disparar renovação.
    await this.http.request({
      method: "POST",
      path: "/logout",
      headers: { "x-access-token": accessToken },
      authenticated: false,
      timeoutMs: 5_000,
    });
  }
}
