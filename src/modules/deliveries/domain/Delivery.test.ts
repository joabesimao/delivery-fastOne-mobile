import {
  activeFilterCount,
  canTransition,
  countByStatus,
  filterOptions,
  matchesFilters,
  NO_FILTERS,
  matchesSearch,
  nextStatus,
  sortForWork,
  type Delivery,
} from "./Delivery";

const makeDelivery = (overrides: Partial<Delivery> = {}): Delivery => ({
  id: 1,
  quantity: "2",
  amount: 30,
  date: new Date("2026-10-20T10:00:00Z"),
  finishedAt: null,
  status: "actived",
  client: { name: "João Conceição", phone: "61999990000" },
  address: {
    street: "Rua das Flores",
    number: 10,
    neighborhood: "Centro",
    city: "Brasília",
    reference: "",
  },
  deliveryman: { id: 7, name: "Carlos Lima", phone: "" },
  ...overrides,
});

describe("Delivery", () => {
  it("avança na ordem ativo → em entrega → finalizado", () => {
    expect(nextStatus("actived")).toBe("delivered");
    expect(nextStatus("delivered")).toBe("finished");
    expect(nextStatus("finished")).toBeNull();
  });

  it("segue as mesmas regras de transição do backend", () => {
    expect(canTransition("actived", "finished")).toBe(true);
    expect(canTransition("delivered", "delivered")).toBe(true);
    expect(canTransition("delivered", "actived")).toBe(false);
    expect(canTransition("finished", "finished")).toBe(false);
  });

  it("busca sem diferenciar acentos nem maiúsculas", () => {
    const delivery = makeDelivery();
    expect(matchesSearch(delivery, "joao conceicao")).toBe(true);
    expect(matchesSearch(delivery, "BRASILIA")).toBe(true);
    expect(matchesSearch(delivery, "carlos")).toBe(true);
    expect(matchesSearch(delivery, "1")).toBe(true);
    expect(matchesSearch(delivery, "maria")).toBe(false);
    expect(matchesSearch(delivery, "  ")).toBe(true);
  });

  it("ordena abertas primeiro (mais antigas no topo) e finalizadas mais recentes primeiro", () => {
    const sorted = sortForWork([
      makeDelivery({ id: 1, status: "finished", date: new Date("2026-10-20") }),
      makeDelivery({ id: 2, status: "actived", date: new Date("2026-10-22") }),
      makeDelivery({ id: 3, status: "finished", date: new Date("2026-10-23") }),
      makeDelivery({ id: 4, status: "delivered", date: new Date("2026-10-21") }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual([4, 2, 3, 1]);
  });

  it("conta por status", () => {
    expect(
      countByStatus([
        makeDelivery({ status: "actived" }),
        makeDelivery({ status: "actived" }),
        makeDelivery({ status: "finished" }),
      ]),
    ).toEqual({ actived: 2, delivered: 0, finished: 1 });
  });

  it("filtra por entregador, cidade e bairro como a listagem do web", () => {
    const semEntregador = makeDelivery({ id: 2, deliveryman: null });
    const outraCidade = makeDelivery({
      id: 3,
      address: { ...makeDelivery().address, city: "Goiânia", neighborhood: "Setor Bueno" },
    });
    const all = [makeDelivery(), semEntregador, outraCidade];

    expect(all.filter((d) => matchesFilters(d, NO_FILTERS))).toHaveLength(3);
    expect(all.filter((d) => matchesFilters(d, { ...NO_FILTERS, deliverymanId: 0 }))).toEqual([
      semEntregador,
    ]);
    expect(
      all.filter((d) => matchesFilters(d, { ...NO_FILTERS, city: "Goiânia" })).map((d) => d.id),
    ).toEqual([3]);
    expect(activeFilterCount({ deliverymanId: 7, city: "Brasília", neighborhood: null })).toBe(2);
  });

  it("monta as opções de filtro a partir das entregas, com bairros da cidade escolhida", () => {
    const all = [
      makeDelivery(),
      makeDelivery({
        id: 2,
        address: { ...makeDelivery().address, city: "Goiânia", neighborhood: "Setor Bueno" },
      }),
    ];
    const options = filterOptions(all, "Goiânia");
    expect(options.cities).toEqual(["Brasília", "Goiânia"]);
    expect(options.neighborhoods).toEqual(["Setor Bueno"]);
    expect(options.deliverymen).toEqual([{ id: 7, name: "Carlos Lima" }]);
  });
});
