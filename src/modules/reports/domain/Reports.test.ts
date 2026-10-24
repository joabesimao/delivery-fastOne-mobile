import type { Delivery } from "@/modules/deliveries/domain/Delivery";
import { averageTicket, buildDeliveriesReport, inRange, lastDays, wholeDays } from "./Reports";

const delivery = (id: number, overrides: Partial<Delivery> = {}): Delivery => ({
  id,
  quantity: "1",
  amount: 10,
  date: new Date(2026, 9, 20, 12),
  finishedAt: null,
  status: "actived",
  client: { name: "Cliente", phone: "" },
  address: { street: "Rua", number: 1, neighborhood: "Centro", city: "Brasília", reference: "" },
  deliveryman: { id: 1, name: "Carlos", phone: "" },
  ...overrides,
});

describe("Reports", () => {
  it("usa dias inteiros no período, em qualquer ordem", () => {
    const range = wholeDays(new Date(2026, 9, 24, 15), new Date(2026, 9, 20, 9));
    expect(range.start).toEqual(new Date(2026, 9, 20, 0, 0, 0, 0));
    expect(range.end).toEqual(new Date(2026, 9, 24, 23, 59, 59, 999));
  });

  it("últimos N dias incluem hoje", () => {
    const range = lastDays(7, new Date(2026, 9, 24, 10));
    expect(range.start).toEqual(new Date(2026, 9, 18));
    expect(range.end.getDate()).toBe(24);
  });

  it("calcula receita e ticket só com finalizadas, como o web", () => {
    const report = buildDeliveriesReport([
      delivery(1, { status: "finished", amount: 30 }),
      delivery(2, { status: "finished", amount: 10 }),
      delivery(3, { status: "delivered", amount: 100 }),
    ]);
    expect(report.totalOrders).toBe(3);
    expect(report.finishedCount).toBe(2);
    expect(report.totalRevenue).toBe(40);
    expect(report.averageTicket).toBe(20);
    expect(report.byStatus).toEqual([
      { name: "Ativo", value: 0 },
      { name: "Em entrega", value: 1 },
      { name: "Finalizado", value: 2 },
    ]);
    expect(averageTicket(0, 0)).toBe(0);
  });

  it("agrupa bairros e ordena entregadores por volume", () => {
    const report = buildDeliveriesReport([
      delivery(1, { deliveryman: null }),
      delivery(2, { status: "finished", amount: 50 }),
      delivery(3, { address: { ...delivery(0).address, neighborhood: " " } }),
    ]);
    expect(report.byNeighborhood).toEqual([
      { name: "Centro", value: 2 },
      { name: "Sem bairro", value: 1 },
    ]);
    expect(report.topDeliverymen[0]).toMatchObject({
      name: "Carlos",
      total: 2,
      finished: 1,
      open: 1,
      revenue: 50,
      completionRate: 50,
    });
    expect(report.topDeliverymen[1]?.name).toBe("Sem entregador");
  });

  it("filtra entregas pelo período", () => {
    const range = wholeDays(new Date(2026, 9, 21), new Date(2026, 9, 22));
    const list = [delivery(1), delivery(2, { date: new Date(2026, 9, 21, 8) })];
    expect(inRange(list, range).map((d) => d.id)).toEqual([2]);
  });
});
