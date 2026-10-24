import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { z } from "zod";
import type {
  Address,
  AddressInput,
  City,
  Client,
  ClientInput,
  Deliveryman,
  DeliverymanInput,
  Neighborhood,
  Product,
  ProductInput,
  Register,
} from "../domain/Catalog";
import type { CatalogRepository } from "../domain/CatalogRepository";

// Algumas listas respondem 204 sem corpo quando estão vazias.
const list = <S extends z.ZodType>(schema: S) =>
  z.preprocess((value) => value ?? [], z.array(schema));

const citySchema = z.object({ id: z.number(), name: z.string() });

const neighborhoodSchema = z.object({
  id: z.number(),
  name: z.string(),
  cityId: z.number(),
  city: z.object({ name: z.string() }).nullish(),
});

const addressSchema = z.object({
  id: z.number(),
  street: z.string(),
  numberHouse: z.coerce.number(),
  neighborhood: z.string(),
  city: z.string(),
  reference: z.string().nullish(),
});

const clientBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  cpf: z.string(),
  phone: z.string(),
  status: z.boolean().nullish(),
});

const clientSchema = clientBaseSchema.extend({
  Register: z.object({ id: z.number(), address: addressSchema.nullish() }).nullish(),
});

const registerSchema = z.object({
  id: z.number(),
  client: clientBaseSchema,
  address: addressSchema,
});

const deliverymanSchema = z.object({
  id: z.number(),
  name: z.string(),
  lastName: z.string(),
  phone: z.string(),
  cpf: z.string().nullish(),
  numberQualification: z.string(),
});

const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.coerce.number(),
  description: z.string(),
  category: z.string(),
  subcategory: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  unit: z.string().nullish(),
  barcode: z.string().nullish(),
  status: z.boolean().nullish(),
  notes: z.string().nullish(),
  imageBase64: z.string().nullish(),
  imageMimeType: z.string().nullish(),
  variations: z.array(z.object({ attribute: z.string(), value: z.string() })).nullish(),
});

const productPageSchema = z.object({
  items: z.array(productSchema),
  pagination: z.object({ hasMore: z.boolean() }).nullish(),
});

const toAddress = (dto: z.infer<typeof addressSchema>): Address => ({
  id: dto.id,
  street: dto.street,
  number: dto.numberHouse,
  neighborhood: dto.neighborhood,
  city: dto.city,
  reference: dto.reference ?? "",
});

const toClient = (
  dto: z.infer<typeof clientBaseSchema>,
  address: Address | null,
  registerId: number | null,
): Client => ({
  id: dto.id,
  name: dto.name,
  cpf: dto.cpf,
  phone: dto.phone,
  active: dto.status !== false,
  address,
  registerId,
});

const toProduct = (dto: z.infer<typeof productSchema>): Product => ({
  id: dto.id,
  name: dto.name,
  price: dto.price,
  description: dto.description,
  category: dto.category,
  subcategory: dto.subcategory ?? null,
  brand: dto.brand ?? null,
  model: dto.model ?? null,
  unit: dto.unit ?? null,
  barcode: dto.barcode ?? null,
  active: dto.status !== false,
  notes: dto.notes ?? null,
  image: dto.imageBase64
    ? { base64: dto.imageBase64, mimeType: dto.imageMimeType ?? "image/jpeg" }
    : null,
  variations: dto.variations ?? [],
});

const addressBody = (address: AddressInput) => ({
  street: address.street.trim(),
  numberHouse: address.number,
  neighborhood: address.neighborhood,
  city: address.city,
  reference: address.reference.trim(),
});

const deliverymanBody = (input: DeliverymanInput) => ({
  name: input.name.trim(),
  lastName: input.lastName.trim(),
  phone: input.phone,
  cpf: input.cpf,
  numberQualification: input.qualification.trim(),
});

const productBody = ({ image, active, ...input }: ProductInput) => ({
  ...input,
  status: active,
  ...(image === undefined
    ? {}
    : { imageBase64: image?.base64 ?? null, imageMimeType: image?.mimeType ?? null }),
});

const PRODUCT_PAGE = 100;

export class HttpCatalogRepository implements CatalogRepository {
  constructor(private readonly http: HttpClient) {}

  private get = (path: string, signal?: AbortSignal, query?: Record<string, number>) =>
    this.http.request<unknown>({ method: "GET", path, signal, query });

  private send = async (method: "POST" | "PUT" | "DELETE", path: string, body?: unknown) => {
    await this.http.request({ method, path, body });
  };

  async listCities(signal?: AbortSignal): Promise<City[]> {
    return parseResponse(list(citySchema), await this.get("/city", signal));
  }
  addCity = (name: string) => this.send("POST", "/city", { name: name.trim() });
  updateCity = (id: number, name: string) => this.send("PUT", `/city/${id}`, { name: name.trim() });
  removeCity = (id: number) => this.send("DELETE", `/city/${id}`);

  async listNeighborhoods(signal?: AbortSignal): Promise<Neighborhood[]> {
    return parseResponse(list(neighborhoodSchema), await this.get("/neighborhood", signal)).map(
      (dto) => ({ id: dto.id, name: dto.name, cityId: dto.cityId, cityName: dto.city?.name ?? "" }),
    );
  }
  addNeighborhood = (input: { name: string; cityId: number }) =>
    this.send("POST", "/neighborhood", { name: input.name.trim(), cityId: input.cityId });
  updateNeighborhood = (id: number, input: { name: string; cityId: number }) =>
    this.send("PUT", `/neighborhood/${id}`, { name: input.name.trim(), cityId: input.cityId });
  removeNeighborhood = (id: number) => this.send("DELETE", `/neighborhood/${id}`);

  async listClients(signal?: AbortSignal): Promise<Client[]> {
    return parseResponse(list(clientSchema), await this.get("/client", signal)).map((dto) =>
      toClient(
        dto,
        dto.Register?.address ? toAddress(dto.Register.address) : null,
        dto.Register?.id ?? null,
      ),
    );
  }

  async listRegisters(signal?: AbortSignal): Promise<Register[]> {
    return parseResponse(list(registerSchema), await this.get("/register", signal)).map((dto) => {
      const address = toAddress(dto.address);
      return { id: dto.id, client: toClient(dto.client, address, dto.id), address };
    });
  }

  async addClient(client: ClientInput, address: AddressInput): Promise<Register> {
    const data = await this.http.request({
      method: "POST",
      path: "/register",
      body: {
        client: { name: client.name.trim(), cpf: client.cpf, phone: client.phone },
        address: addressBody(address),
      },
    });
    const { id } = parseResponse(z.object({ id: z.number() }), data);
    const created: Address = { id: 0, ...address };
    return {
      id,
      address: created,
      client: { id: 0, ...client, active: true, address: created, registerId: id },
    };
  }

  updateClient = (id: number, client: Partial<ClientInput> & { active?: boolean }) => {
    const { active, ...rest } = client;
    return this.send("PUT", `/client/${id}`, {
      ...rest,
      ...(active !== undefined && { status: active }),
    });
  };
  updateAddress = (id: number, address: AddressInput) =>
    this.send("PUT", `/address/${id}`, addressBody(address));
  // Apaga cliente e endereço juntos (rota de register, só admin).
  removeClient = (registerId: number) => this.send("DELETE", `/register/${registerId}`);

  async listDeliverymen(signal?: AbortSignal): Promise<Deliveryman[]> {
    return parseResponse(list(deliverymanSchema), await this.get("/deliveryman", signal)).map(
      (dto) => ({
        id: dto.id,
        name: dto.name,
        lastName: dto.lastName,
        phone: dto.phone,
        cpf: dto.cpf ?? null,
        qualification: dto.numberQualification,
      }),
    );
  }
  addDeliveryman = (input: DeliverymanInput) =>
    this.send("POST", "/deliveryman", deliverymanBody(input));
  updateDeliveryman = (id: number, input: DeliverymanInput) =>
    this.send("PUT", `/deliveryman/${id}`, deliverymanBody(input));
  removeDeliveryman = (id: number) => this.send("DELETE", `/deliveryman/${id}`);

  // A API pagina em no máximo 100; o catálogo é pequeno, então busca tudo.
  async listProducts(signal?: AbortSignal): Promise<Product[]> {
    const products: Product[] = [];
    for (let offset = 0; ; offset += PRODUCT_PAGE) {
      const page = parseResponse(
        productPageSchema,
        await this.get("/product", signal, { limit: PRODUCT_PAGE, offset }),
      );
      products.push(...page.items.map(toProduct));
      if (!page.pagination?.hasMore || page.items.length === 0) return products;
    }
  }
  addProduct = (input: ProductInput) => this.send("POST", "/product", productBody(input));
  updateProduct = (id: number, input: ProductInput) =>
    this.send("PUT", `/product/${id}`, productBody(input));
  removeProduct = (id: number) => this.send("DELETE", `/product/${id}`);
}
