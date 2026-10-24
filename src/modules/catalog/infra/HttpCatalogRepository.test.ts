import type { HttpClient, HttpRequest } from "@/core/http/HttpClient";
import { HttpCatalogRepository } from "./HttpCatalogRepository";

const makeSut = (respond: (req: HttpRequest) => unknown = () => undefined) => {
  const request = jest.fn(async (req: HttpRequest) => respond(req));
  const http: HttpClient = { request: request as HttpClient["request"] };
  return { sut: new HttpCatalogRepository(http), request };
};

describe("HttpCatalogRepository", () => {
  it("trata 204 (lista vazia) como lista vazia", async () => {
    const { sut } = makeSut(() => undefined);
    await expect(sut.listClients()).resolves.toEqual([]);
  });

  it("lê cliente com o endereço e o id do register", async () => {
    const { sut } = makeSut(() => [
      {
        id: 3,
        name: "Maria",
        cpf: "52998224725",
        phone: "61999990000",
        status: false,
        Register: {
          id: 9,
          address: {
            id: 4,
            street: "Rua A",
            numberHouse: "10",
            neighborhood: "Centro",
            city: "Brasília",
            reference: null,
          },
        },
      },
    ]);
    const [client] = await sut.listClients();
    expect(client).toEqual({
      id: 3,
      name: "Maria",
      cpf: "52998224725",
      phone: "61999990000",
      active: false,
      registerId: 9,
      address: {
        id: 4,
        street: "Rua A",
        number: 10,
        neighborhood: "Centro",
        city: "Brasília",
        reference: "",
      },
    });
  });

  it("cadastra cliente pelo /register no formato do web", async () => {
    const { sut, request } = makeSut(() => ({ id: 21 }));
    const register = await sut.addClient(
      { name: " Maria ", cpf: "52998224725", phone: "61999990000" },
      { street: " Rua A ", number: 10, neighborhood: "Centro", city: "Brasília", reference: "" },
    );
    expect(register.id).toBe(21);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/register",
        body: {
          client: { name: "Maria", cpf: "52998224725", phone: "61999990000" },
          address: {
            street: "Rua A",
            numberHouse: 10,
            neighborhood: "Centro",
            city: "Brasília",
            reference: "",
          },
        },
      }),
    );
  });

  it("busca todas as páginas de produtos", async () => {
    const product = (id: number) => ({
      id,
      name: `P${id}`,
      price: "10.50",
      description: "d",
      category: "c",
      variations: [],
    });
    const { sut, request } = makeSut((req) =>
      req.query?.offset === 0
        ? { items: [product(1)], pagination: { hasMore: true } }
        : { items: [product(2)], pagination: { hasMore: false } },
    );
    const products = await sut.listProducts();
    expect(products.map((p) => p.id)).toEqual([1, 2]);
    expect(products[0]?.price).toBe(10.5);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("só manda a imagem do produto quando ela mudou", async () => {
    const { sut, request } = makeSut();
    const input = {
      name: "Gás",
      price: 120,
      description: "P13",
      category: "Gás",
      subcategory: null,
      brand: null,
      model: null,
      unit: null,
      barcode: null,
      active: true,
      notes: null,
      variations: [],
    };
    await sut.updateProduct(1, input);
    await sut.updateProduct(1, { ...input, image: null });
    const [first, second] = request.mock.calls.map(([req]) => req.body as Record<string, unknown>);
    expect(first).not.toHaveProperty("imageBase64");
    expect(first).toMatchObject({ status: true });
    expect(second).toMatchObject({ imageBase64: null, imageMimeType: null });
  });

  it("exclui cliente pelo register (apaga endereço junto)", async () => {
    const { sut, request } = makeSut();
    await sut.removeClient(9);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "DELETE", path: "/register/9" }),
    );
  });
});
