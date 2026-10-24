import type { HttpClient, HttpRequest } from "@/core/http/HttpClient";
import { HttpDeliveryRepository } from "./HttpDeliveryRepository";

const orderDto = {
  id: 12,
  quantity: "3",
  amount: 45.5,
  data: "2026-10-20T10:00:00.000Z",
  finishedAt: null,
  status: "actived",
  unitStore: { id: 1, name: "Matriz" },
  deliveryman: { id: 7, name: "Carlos", lastName: "Lima", phone: "61988887777" },
  Register: {
    client: { name: "Maria", phone: "61999990000", cpf: "000" },
    address: {
      street: "Rua A",
      numberHouse: 10,
      neighborhood: "Centro",
      city: "Brasília",
      reference: "Portão azul",
    },
  },
};

const makeSut = (response: unknown) => {
  const request = jest.fn(async (_req: HttpRequest) => response);
  const http: HttpClient = { request: request as HttpClient["request"] };
  return { sut: new HttpDeliveryRepository(http), request };
};

describe("HttpDeliveryRepository", () => {
  it("converte o pedido da API em entidade", async () => {
    const { sut } = makeSut([orderDto]);
    const [delivery] = await sut.list();

    expect(delivery).toEqual({
      id: 12,
      quantity: "3",
      amount: 45.5,
      date: new Date("2026-10-20T10:00:00.000Z"),
      finishedAt: null,
      status: "actived",
      client: { name: "Maria", phone: "61999990000" },
      address: {
        street: "Rua A",
        number: 10,
        neighborhood: "Centro",
        city: "Brasília",
        reference: "Portão azul",
      },
      deliveryman: { id: 7, name: "Carlos Lima", phone: "61988887777" },
    });
  });

  it("aceita pedido sem entregador", async () => {
    const { sut } = makeSut([{ ...orderDto, deliveryman: null }]);
    const [delivery] = await sut.list();
    expect(delivery?.deliveryman).toBeNull();
  });

  it("falha com invalid_response quando o contrato muda", async () => {
    const { sut } = makeSut([{ ...orderDto, status: "cancelado" }]);
    await expect(sut.list()).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("transforma o `null` da API em not_found", async () => {
    const { sut } = makeSut(null);
    await expect(sut.getById(99)).rejects.toMatchObject({ kind: "not_found" });
  });

  it("envia só o status e não repete o 'finalizar'", async () => {
    const { sut, request } = makeSut({ ...orderDto, status: "finished" });

    await sut.updateStatus(12, "finished");
    expect(request).toHaveBeenLastCalledWith({
      method: "PUT",
      path: "/orderDelivery/12",
      body: { status: "finished" },
      idempotent: false,
    });

    await sut.updateStatus(12, "delivered");
    expect(request.mock.lastCall?.[0]).toMatchObject({ idempotent: true });
  });
});
