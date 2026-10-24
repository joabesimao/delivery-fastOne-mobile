const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const phoneMask = (value: string = "") => {
  const digits = onlyDigits(value).slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const phoneDigits = (value: string = "") => onlyDigits(value);

export const currencyInputMask = (value: string = "") => {
  const digits = onlyDigits(value);
  if (!digits) return "";

  const cents = (digits.replace(/^0+(?=\d)/, "") || "0").padStart(3, "0");
  const integer = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integer},${cents.slice(-2)}`;
};

export const parseDecimal = (value: string): number => {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return Number.NaN;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatNumber = (value: number, fractionDigits = 0) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const pad = (n: number) => String(n).padStart(2, "0");

export const formatDate = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDateTime = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatRelative = (value: Date | string, now: Date = new Date()) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return formatDate(date);
};

export const cpfMask = (value: string = "") => {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const cpfDigits = (value: string = "") => onlyDigits(value).slice(0, 11);

// Mesmo algoritmo dos dígitos verificadores usado no painel web.
export const isValidCpf = (value: string = ""): boolean => {
  const d = cpfDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(d[i]) * (length + 1 - i);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
};

export const formatCurrencyInput = (value: number) =>
  currencyInputMask(String(Math.round(value * 100)));

const pad2 = (n: number) => String(n).padStart(2, "0");

// Data local em AAAA-MM-DD (nome de arquivo, agrupamento por dia).
export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
