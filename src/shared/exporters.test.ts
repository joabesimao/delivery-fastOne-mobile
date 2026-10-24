import { escapeHtml, toCsv } from "./exporters";

jest.mock("expo-file-system", () => ({ File: jest.fn(), Paths: {} }));
jest.mock("expo-print", () => ({}));
jest.mock("expo-sharing", () => ({}));

describe("exporters", () => {
  it("gera CSV com ponto e vírgula, BOM e aspas quando preciso", () => {
    const csv = toCsv(
      ["nome", "obs"],
      [
        ["Ana; Bia", 'disse "oi"'],
        ["Carlos", null],
      ],
    );
    expect(csv).toBe('﻿nome;obs\n"Ana; Bia";"disse ""oi"""\nCarlos;');
  });

  it("neutraliza fórmulas de planilha", () => {
    expect(toCsv(["v"], [["=1+1"]])).toBe("﻿v\n'=1+1");
  });

  it("escapa HTML", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});
