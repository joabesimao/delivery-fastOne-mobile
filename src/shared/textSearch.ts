// Busca local com ranking, para achar um nome digitando poucas letras.

export const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export interface SearchFields {
  // Campo principal do ranking (ex.: nome do cliente).
  name: string;
  // Comparados só por dígitos (telefone, CPF): "61 9999" acha "(61) 99999-...".
  digits?: readonly string[];
  // Texto extra que também conta como acerto (ex.: endereço), com prioridade menor.
  extra?: readonly string[];
}

// Menor é melhor. null = não combina.
const scoreOf = (fields: SearchFields, query: string): number | null => {
  const name = normalizeText(fields.name);
  const tokens = query.split(/\s+/).filter(Boolean);
  const words = name.split(/\s+/);

  if (name.startsWith(query)) return 0;
  // Cada palavra digitada é começo de uma palavra do nome: "ma sou" acha "Maria Souza".
  if (tokens.every((token) => words.some((word) => word.startsWith(token)))) return 1;
  if (name.includes(query)) return 2;

  const queryDigits = onlyDigits(query);
  // Só compara dígitos quando a busca é numérica (aceita máscara: "(61) 9999-", "111.222")
  // e tem 3+ dígitos, para "6" não trazer todos os telefones.
  const isNumeric = query.replace(/[\s().\-+/]/g, "") === queryDigits;
  if (isNumeric && queryDigits.length >= 3) {
    if (fields.digits?.some((value) => onlyDigits(value).includes(queryDigits))) return 3;
  }

  const haystack = normalizeText([fields.name, ...(fields.extra ?? [])].join(" "));
  if (tokens.every((token) => haystack.includes(token))) return 4;
  return null;
};

// Filtra e ordena por relevância; empates ficam em ordem alfabética do nome.
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
