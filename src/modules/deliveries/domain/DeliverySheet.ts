// Folha de entrega impressa ao criar o pedido (mesmo layout do painel web).

export type SheetFormat = "a4" | "thermal80" | "thermal58";

export const sheetFormatLabels: Record<SheetFormat, string> = {
  a4: "A4",
  thermal80: "Térmica 80mm",
  thermal58: "Térmica 58mm",
};

export interface DeliverySheetData {
  orderId: number | null;
  createdAt: Date;
  clientName: string;
  phone: string;
  street: string;
  number: number;
  neighborhood: string;
  city: string;
  reference: string;
  quantity: string;
  amount: string;
}

// Tamanho da página em pontos (72/pol). Térmica: largura do rolo, altura suficiente para a folha.
const MM = 72 / 25.4;
export const sheetPageSize = (format: SheetFormat) =>
  format === "a4"
    ? { width: 595, height: 842 }
    : { width: Math.round((format === "thermal80" ? 80 : 58) * MM), height: Math.round(200 * MM) };

export const buildSheetHtml = (
  data: DeliverySheetData,
  format: SheetFormat,
  company: { name: string; document?: string },
  escape: (value: unknown) => string,
  formatDateTime: (date: Date) => string,
) => {
  const a4 = format === "a4";
  const line = "_".repeat(a4 ? 80 : 32);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: ${a4 ? "16mm" : "2mm"}; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: ${a4 ? "13px" : "11px"}; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; gap: 8px; ${a4 ? "" : "flex-direction: column;"} }
  .brand { font-size: ${a4 ? "24px" : "15px"}; font-weight: 800; letter-spacing: .5px; }
  .title { font-size: ${a4 ? "20px" : "12px"}; font-weight: 700; }
  .muted { font-size: 11px; color: #444; }
  .grid { display: flex; gap: 8px; margin-bottom: 12px; }
  .box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 6px 8px; }
  .label { font-size: 10px; color: #555; margin-bottom: 2px; }
  .value { font-size: ${a4 ? "18px" : "13px"}; font-weight: 700; }
  .section { margin-bottom: 12px; }
  .name { font-size: 14px; font-weight: 700; }
  .signs { display: flex; justify-content: space-between; gap: 8px; margin-top: ${a4 ? "56px" : "24px"}; ${a4 ? "" : "flex-direction: column;"} }
  .sign { flex: 1; border-top: 1px solid #111; padding-top: 4px; font-size: 11px; text-align: center; ${a4 ? "" : "margin-top: 20px;"} }
</style></head><body>
  <div class="head">
    <div>
      <div class="brand">${escape(company.name)}</div>
      ${company.document ? `<div class="muted">Documento: ${escape(company.document)}</div>` : ""}
    </div>
    <div style="text-align:${a4 ? "right" : "left"}">
      <div class="title">FOLHA DE ENTREGA</div>
      <div class="muted">Emitido em ${escape(formatDateTime(data.createdAt))}</div>
    </div>
  </div>
  <div class="grid">
    <div class="box"><div class="label">Pedido</div><div class="value">${data.orderId === null ? "—" : `#${data.orderId}`}</div></div>
    <div class="box"><div class="label">Quantidade</div><div class="value">${escape(data.quantity)}</div></div>
    <div class="box"><div class="label">Valor</div><div class="value">${escape(data.amount)}</div></div>
  </div>
  <div class="section">
    <div class="label">Cliente</div>
    <div class="name">${escape(data.clientName)}</div>
    <div>Telefone: ${escape(data.phone)}</div>
  </div>
  <div class="section">
    <div class="label">Endereço de entrega</div>
    <div>${escape(data.street)}, ${escape(data.number)}</div>
    <div>${escape(data.neighborhood)} - ${escape(data.city)}</div>
    <div>Referência: ${escape(data.reference || "Sem referência")}</div>
  </div>
  <div class="section">
    <div class="label">Observações</div>
    <div>${line}</div>
    ${a4 ? `<div>${line}</div>` : ""}
  </div>
  <div class="signs">
    <div class="sign">Assinatura do entregador</div>
    <div class="sign">Assinatura do cliente</div>
    <div class="sign">Data e hora do recebimento</div>
  </div>
</body></html>`;
};
