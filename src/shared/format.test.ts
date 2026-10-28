import {
  cpfMask,
  currencyInputMask,
  formatCurrencyInput,
  formatRelative,
  isoDay,
  isValidCpf,
  parseDecimal,
  phoneMask,
} from "./format";

describe("format", () => {
  it("formata telefone fixo e celular", () => {
    expect(phoneMask("6133334444")).toBe("(61) 3333-4444");
    expect(phoneMask("61999998888")).toBe("(61) 99999-8888");
    expect(phoneMask("")).toBe("");
  });

  it("aceita vírgula ou ponto como decimal", () => {
    expect(parseDecimal("6,19")).toBe(6.19);
    expect(parseDecimal("6.19")).toBe(6.19);
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("")).toBeNaN();
  });

  it("aplica máscara de moeda como o painel web", () => {
    expect(currencyInputMask("123456")).toBe("1.234,56");
    expect(currencyInputMask("5")).toBe("0,05");
  });

  it("descreve tempo relativo", () => {
    const now = new Date("2026-10-24T12:00:00");
    expect(formatRelative(new Date("2026-10-24T11:59:40"), now)).toBe("agora");
    expect(formatRelative(new Date("2026-10-24T11:15:00"), now)).toBe("há 45 min");
    expect(formatRelative(new Date("2026-10-24T09:00:00"), now)).toBe("há 3 h");
    expect(formatRelative(new Date("2026-10-20T09:00:00"), now)).toBe("20/10/2026");
  });

  it("aplica a máscara de CPF", () => {
    expect(cpfMask("52998224725")).toBe("529.982.247-25");
    expect(cpfMask("5299")).toBe("529.9");
  });

  it("valida os dígitos verificadores do CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("preenche o campo de valor a partir de um número", () => {
    expect(formatCurrencyInput(1234.5)).toBe("1.234,50");
  });

  it("formata o dia local em AAAA-MM-DD", () => {
    expect(isoDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
