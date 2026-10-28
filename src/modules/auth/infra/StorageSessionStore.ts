import type { KeyValueStorage } from "@/core/storage/KeyValueStorage";
import { z } from "zod";
import type { SessionStore } from "../data/protocols";
import { ACCOUNT_ROLES, type Session } from "../domain/Session";

const SESSION_KEY = "fastone.session";

const storedSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  name: z.string(),
  role: z.enum(ACCOUNT_ROLES),
});

export class StorageSessionStore implements SessionStore {
  constructor(private readonly storage: KeyValueStorage) {}

  async load(): Promise<Session | null> {
    const raw = await this.storage.get(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // JSON corrompido: trata como sem sessão.
    }
    await this.storage.remove(SESSION_KEY);
    return null;
  }

  save(session: Session): Promise<void> {
    return this.storage.set(SESSION_KEY, JSON.stringify(session));
  }

  clear(): Promise<void> {
    return this.storage.remove(SESSION_KEY);
  }
}
