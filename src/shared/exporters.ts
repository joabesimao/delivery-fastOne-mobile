import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { isAvailableAsync, shareAsync } from "expo-sharing";

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Evita injeção de fórmula ao abrir no Excel/Sheets.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// Ponto e vírgula + BOM: abre direto com acentos no Excel em pt-BR, como o CSV do painel web.
export const toCsv = (header: readonly string[], rows: readonly (readonly unknown[])[]) =>
  "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");

export const shareCsv = async (fileName: string, csv: string) => {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  if (!(await isAvailableAsync())) throw new Error("Compartilhamento indisponível neste aparelho.");
  await shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
};

export const sharePdf = async (html: string, size?: { width: number; height: number }) => {
  const { uri } = await Print.printToFileAsync({ html, ...size });
  if (!(await isAvailableAsync())) throw new Error("Compartilhamento indisponível neste aparelho.");
  await shareAsync(uri, { mimeType: "application/pdf", UTI: ".pdf" });
};

export const printHtml = (html: string, size?: { width: number; height: number }) =>
  Print.printAsync({ html, ...size });

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
