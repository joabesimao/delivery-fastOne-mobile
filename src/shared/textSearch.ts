export const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export interface SearchFields {
  name: string;
  digits?: readonly string[];
  extra?: readonly string[];
}

const scoreOf = (fields: SearchFields, query: string): number | null => {
  const name = normalizeText(fields.name);
  const tokens = query.split(/\s+/).filter(Boolean);
  const words = name.split(/\s+/);

  if (name.startsWith(query)) return 0;
  if (tokens.every((token) => words.some((word) => word.startsWith(token)))) return 1;
  if (name.includes(query)) return 2;

  const queryDigits = onlyDigits(query);
  const isNumeric = query.replace(/[\s().\-+/]/g, "") === queryDigits;
  if (isNumeric && queryDigits.length >= 3) {
    if (fields.digits?.some((value) => onlyDigits(value).includes(queryDigits))) return 3;
  }

  const haystack = normalizeText([fields.name, ...(fields.extra ?? [])].join(" "));
  if (tokens.every((token) => haystack.includes(token))) return 4;
  return null;
};

export function rankByText<T>(
  items: readonly T[],
  term: string,
  fieldsOf: (item: T) => SearchFields,
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const query = normalizeText(term);
  if (!query) return [];

  return items
    .map((item) => {
      const fields = fieldsOf(item);
      return { item, name: fields.name, score: scoreOf(fields, query) };
    })
    .filter((entry): entry is { item: T; name: string; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit)
    .map((entry) => entry.item);
}
