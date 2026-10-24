import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { ACCOUNT_ROLES } from "@/modules/auth/domain/Session";
import { z } from "zod";
import type { Account, AccountChanges, AccountRepository, NewAccount } from "../domain/Account";

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.enum(ACCOUNT_ROLES),
  active: z.boolean().nullish(),
});

export class HttpAccountRepository implements AccountRepository {
  constructor(private readonly http: HttpClient) {}

  async list(signal?: AbortSignal): Promise<Account[]> {
    const data = await this.http.request({ method: "GET", path: "/account", signal });
    return parseResponse(z.array(accountSchema), data).map((dto) => ({
      ...dto,
      active: dto.active !== false,
    }));
  }

  async create(input: NewAccount): Promise<void> {
    await this.http.request({
      method: "POST",
      path: "/account/staff",
      body: {
        name: input.name.trim(),
        email: input.email.trim(),
        role: input.role,
        password: input.password,
        passwordConfirmation: input.password,
      },
    });
  }

  async update(id: number, { password, ...changes }: AccountChanges): Promise<void> {
    await this.http.request({
      method: "PUT",
      path: `/account/${id}`,
      body: {
        ...changes,
        ...(password ? { password, passwordConfirmation: password } : {}),
      },
    });
  }

  async remove(id: number): Promise<void> {
    await this.http.request({ method: "DELETE", path: `/account/${id}` });
  }
}
