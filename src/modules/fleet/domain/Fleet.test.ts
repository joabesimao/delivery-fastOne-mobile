import {
  computeTotalValue,
  consumptionKmPerLiter,
  lastKnownKm,
  oilChangeStatus,
  validateFuelRefill,
  validateOilChange,
  validateOilInterval,
  validateVehicle,
  vehicleLabel,
  type OilChange,
} from "./Fleet";

const oilChange = (nextChangeKm: number): OilChange => ({
  id: 1,
  vehicleId: 1,
  vehiclePlate: "ABC1D23",
  deliverymanId: 1,
  deliverymanName: "Ana Souza",
  km: nextChangeKm - 1000,
  nextChangeKm,
  changeDate: new Date(),
});

describe("Fleet", () => {
  it("calcula o total do abastecimento como o painel web", () => {
    expect(computeTotalValue(8.5, 6.19)).toBe(52.62);
    expect(computeTotalValue(0, 6.19)).toBeNull();
    expect(computeTotalValue(Number.NaN, 6)).toBeNull();
  });

  it("calcula consumo só quando há km rodado", () => {
    expect(consumptionKmPerLiter({ kmDriven: 300, liters: 10 })).toBe(30);
    expect(consumptionKmPerLiter({ kmDriven: null, liters: 10 })).toBeNull();
  });

  it("usa o maior km entre abastecimentos e trocas", () => {
    expect(lastKnownKm([{ km: 1200 } as never], [{ km: 1500 } as never])).toBe(1500);
    expect(lastKnownKm([], [])).toBe(0);
  });

  it("classifica a situação da troca de óleo", () => {
    expect(oilChangeStatus(undefined, 1000)).toEqual({ kind: "unknown" });
    expect(oilChangeStatus(oilChange(5000), 3000).kind).toBe("ok");
    expect(oilChangeStatus(oilChange(5000), 4600)).toEqual({
      kind: "soon",
      nextChangeKm: 5000,
      remainingKm: 400,
    });
    expect(oilChangeStatus(oilChange(5000), 5100).kind).toBe("overdue");
  });

  it("valida os formulários", () => {
    expect(validateFuelRefill({ km: 1000, liters: 5, pricePerLiter: 6 })).toEqual({});
    expect(
      Object.keys(validateFuelRefill({ km: 0, liters: Number.NaN, pricePerLiter: -1 })),
    ).toEqual(["km", "liters", "pricePerLiter"]);
    expect(validateOilChange({ km: 10.5 })).toHaveProperty("km");
  });

  it("monta o rótulo do veículo sem partes vazias", () => {
    expect(vehicleLabel({ plate: "ABC1D23", brand: "Honda", model: "CG 160" })).toBe(
      "ABC1D23 · Honda CG 160",
    );
    expect(vehicleLabel({ plate: "ABC1D23", brand: null, model: "" })).toBe("ABC1D23");
  });

  it("valida veículo e intervalo de troca como o backend", () => {
    expect(validateVehicle({ plate: "abc-1d23", model: "CG 160" })).toEqual({});
    expect(validateVehicle({ plate: "AB1", model: " " })).toEqual({
      plate: "Informe a placa do veículo.",
      model: "Informe o modelo.",
    });
    expect(validateOilInterval(1000)).toBeNull();
    expect(validateOilInterval(0)).not.toBeNull();
    expect(validateOilInterval(10.5)).not.toBeNull();
  });
});
