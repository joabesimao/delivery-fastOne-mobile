import { buildSheetHtml, sheetPageSize, type DeliverySheetData } from "./DeliverySheet";

const data: DeliverySheetData = {
  orderId: 42,
  createdAt: new Date(2026, 9, 24, 10, 30),
  clientName: "Maria <b>",
  phone: "(61) 99999-0000",
  street: "Rua A",
  number: 10,
  neighborhood: "Centro",
  city: "Brasília",
  reference: "",
  quantity: "2",
  amount: "R$ 30,00",
};

const escape = (v: unknown) => String(v).replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("DeliverySheet", () => {
  it("monta a folha com os dados e escapa o HTML", () => {
    const html = buildSheetHtml(
      data,
      "a4",
      { name: "FastOne Delivery" },
      escape,
      () => "24/10/2026 10:30",
    );
    expect(html).toContain("FOLHA DE ENTREGA");
    expect(html).toContain("#42");
    expect(html).toContain("Maria &lt;b&gt;");
    expect(html).toContain("Referência: Sem referência");
    expect(html).toContain("Assinatura do cliente");
    expect(html).not.toContain("Documento:");
  });

  it("usa a largura do rolo na térmica", () => {
    expect(sheetPageSize("a4")).toEqual({ width: 595, height: 842 });
    expect(sheetPageSize("thermal80").width).toBe(227);
    expect(sheetPageSize("thermal58").width).toBe(164);
  });
});
