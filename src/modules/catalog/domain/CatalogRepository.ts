import type {
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
} from "./Catalog";

export interface CatalogRepository {
  listCities(signal?: AbortSignal): Promise<City[]>;
  addCity(name: string): Promise<void>;
  updateCity(id: number, name: string): Promise<void>;
  removeCity(id: number): Promise<void>;

  listNeighborhoods(signal?: AbortSignal): Promise<Neighborhood[]>;
  addNeighborhood(input: { name: string; cityId: number }): Promise<void>;
  updateNeighborhood(id: number, input: { name: string; cityId: number }): Promise<void>;
  removeNeighborhood(id: number): Promise<void>;

  listClients(signal?: AbortSignal): Promise<Client[]>;
  listRegisters(signal?: AbortSignal): Promise<Register[]>;
  addClient(client: ClientInput, address: AddressInput): Promise<Register>;
  updateClient(id: number, client: Partial<ClientInput> & { active?: boolean }): Promise<void>;
  updateAddress(id: number, address: AddressInput): Promise<void>;
  removeClient(id: number): Promise<void>;

  listDeliverymen(signal?: AbortSignal): Promise<Deliveryman[]>;
  addDeliveryman(input: DeliverymanInput): Promise<void>;
  updateDeliveryman(id: number, input: DeliverymanInput): Promise<void>;
  removeDeliveryman(id: number): Promise<void>;

  listProducts(signal?: AbortSignal): Promise<Product[]>;
  addProduct(input: ProductInput): Promise<void>;
  updateProduct(id: number, input: ProductInput): Promise<void>;
  removeProduct(id: number): Promise<void>;
}
