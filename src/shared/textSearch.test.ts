import { normalizeText, rankByText, type SearchFields } from "./textSearch";

interface Person {
  name: string;
  phone: string;
  cpf: string;
  city: string;
}

const people: Person[] = [
  { name: "Maria Souza", phone: "61999998888", cpf: "11122233344", city: "Ceilândia" },
  { name: "Marcos Lima", phone: "61988887777", cpf: "22233344455", city: "Taguatinga" },
  { name: "Ana Maria Costa", phone: "61977776666", cpf: "33344455566", city: "Samambaia" },
  { name: "João Mariano", phone: "61966665555", cpf: "44455566677", city: "Ceilândia" },
  { name: "Évora Antunes", phone: "61955554444", cpf: "55566677788", city: "Guará" },
];

const fields = (p: Person): SearchFields => ({
  name: p.name,
  digits: [p.phone, p.cpf],
  extra: [p.city],
});

const names = (term: string, limit?: number) =>
  rankByText(people, term, fields, limit).map((p) => p.name);

describe("normalizeText", () => {
  it("remove acentos, caixa e espaços das pontas", () => {
    expect(normalizeText("  Évora JOÃO ")).toBe("evora joao");
  });
});

describe("rankByText", () => {
  it("não retorna nada com busca vazia", () => {
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });

  it("prioriza nomes que começam com o texto, depois palavras e depois trechos", () => {
    // "Mar": começa com (Marcos, Maria) > palavra começa (Ana Maria, João Mariano).
    expect(names("mar")).toEqual(["Marcos Lima", "Maria Souza", "Ana Maria Costa", "João Mariano"]);
  });

  it("acha pelo começo de cada palavra digitada", () => {
    expect(names("ma sou")).toEqual(["Maria Souza"]);
    expect(names("sou")).toEqual(["Maria Souza"]);
  });

  it("ignora acentos e maiúsculas", () => {
    expect(names("EVORA")).toEqual(["Évora Antunes"]);
    expect(names("joao")).toEqual(["João Mariano"]);
  });

  it("acha por telefone ou CPF digitando só números, com ou sem máscara", () => {
    expect(names("(61) 98888")).toEqual(["Marcos Lima"]);
    expect(names("333444555")).toEqual(["Ana Maria Costa"]);
  });

  it("não compara dígitos em buscas curtas para não trazer todos os telefones", () => {
    expect(names("61")).toEqual([]);
  });

  it("usa os campos extras com prioridade menor", () => {
    expect(names("ceilandia")).toEqual(["João Mariano", "Maria Souza"]);
  });

  it("respeita o limite de resultados", () => {
    expect(names("mar", 2)).toEqual(["Marcos Lima", "Maria Souza"]);
  });
});
