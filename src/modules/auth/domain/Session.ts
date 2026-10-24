export const ACCOUNT_ROLES = ["admin", "gerente_estoque", "entregador", "user"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export interface Session {
  accessToken: string;
  refreshToken: string;
  name: string;
  role: AccountRole;
}

export interface AuthTokens {
  accessToken: string;
  // Na janela de tolerância do backend o refresh devolve só o accessToken.
  refreshToken?: string;
}

export type SessionStatus = "restoring" | "signedOut" | "signedIn";

export type SignOutReason = "user" | "expired";

export const roleLabels: Record<AccountRole, string> = {
  admin: "Administrador",
  gerente_estoque: "Gerente de estoque",
  entregador: "Entregador",
  user: "Operador",
};

export const isCourier = (role: AccountRole): boolean => role === "entregador";

export const isAccountRole = (value: unknown): value is AccountRole =>
  typeof value === "string" && (ACCOUNT_ROLES as readonly string[]).includes(value);

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;
