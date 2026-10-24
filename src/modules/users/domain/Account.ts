import type { AccountRole } from "@/modules/auth/domain/Session";

export interface Account {
  id: number;
  name: string;
  email: string;
  role: AccountRole;
  active: boolean;
}

// O backend só cria contas com estes papéis (add-staff-account-validation).
export const CREATABLE_ROLES = [
  "admin",
  "user",
  "entregador",
] as const satisfies readonly AccountRole[];

export interface NewAccount {
  name: string;
  email: string;
  role: AccountRole;
  password: string;
}

export interface AccountChanges {
  name?: string;
  email?: string;
  role?: AccountRole;
  active?: boolean;
  password?: string;
}

export interface AccountRepository {
  list(signal?: AbortSignal): Promise<Account[]>;
  create(input: NewAccount): Promise<void>;
  update(id: number, changes: AccountChanges): Promise<void>;
  remove(id: number): Promise<void>;
}

// Mesmas regras do backend: e-mail válido e senha de 8 a 72 bytes.
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateAccount = (
  input: { name: string; email: string; password: string; confirmation: string },
  passwordRequired: boolean,
) => {
  const errors: Partial<Record<"name" | "email" | "password" | "confirmation", string>> = {};
  if (!input.name.trim()) errors.name = "Informe o nome.";
  if (!EMAIL.test(input.email.trim())) errors.email = "Informe um e-mail válido.";
  if (passwordRequired || input.password) {
    if (input.password.length < PASSWORD_MIN_LENGTH)
      errors.password = `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    else if (input.password !== input.confirmation) errors.confirmation = "As senhas não conferem.";
  }
  return errors;
};
