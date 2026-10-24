// Cadastros básicos da operação, nos mesmos formatos que o painel web usa.

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const hasErrors = (errors: object) => Object.keys(errors).length > 0;
export { hasErrors };

export interface City {
  id: number;
  name: string;
}

export interface Neighborhood {
  id: number;
  name: string;
  cityId: number;
  cityName: string;
}

export interface Address {
  id: number;
  street: string;
  number: number;
  neighborhood: string;
  city: string;
  reference: string;
}

export interface Client {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  active: boolean;
  address: Address | null;
  registerId: number | null;
}

// "Register" no backend: o vínculo cliente + endereço que o pedido usa.
export interface Register {
  id: number;
  client: Client;
  address: Address;
}

export interface Deliveryman {
  id: number;
  name: string;
  lastName: string;
  phone: string;
  cpf: string | null;
  qualification: string;
}

export interface ProductVariation {
  attribute: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  unit: string | null;
  barcode: string | null;
  active: boolean;
  notes: string | null;
  image: { base64: string; mimeType: string } | null;
  variations: ProductVariation[];
}

export interface AddressInput {
  street: string;
  number: number;
  neighborhood: string;
  city: string;
  reference: string;
}

export interface ClientInput {
  name: string;
  cpf: string;
  phone: string;
}

export interface DeliverymanInput {
  name: string;
  lastName: string;
  phone: string;
  cpf: string;
  qualification: string;
}

export interface ProductInput {
  name: string;
  price: number;
  description: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  unit: string | null;
  barcode: string | null;
  active: boolean;
  notes: string | null;
  variations: ProductVariation[];
  // undefined = não mexe; null = remove a imagem.
  image?: { base64: string; mimeType: string } | null;
}

export const deliverymanName = (d: Pick<Deliveryman, "name" | "lastName">) =>
  `${d.name} ${d.lastName}`.trim();

export const formatClientAddress = (address: Address | AddressInput | null) =>
  address
    ? `${address.street}, ${address.number} · ${address.neighborhood}, ${address.city}`
    : "Sem endereço";

// Imagem do produto: o backend aceita até 5 MB em base64.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const base64Bytes = (base64: string) => {
  const padding = base64.match(/=+$/)?.[0].length ?? 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const required = (value: string) => value.trim().length > 0;

export const validateClient = (
  input: ClientInput,
  isValidCpf: (cpf: string) => boolean,
): FieldErrors<keyof ClientInput> => {
  const errors: FieldErrors<keyof ClientInput> = {};
  if (!required(input.name)) errors.name = "Informe o nome do cliente.";
  if (!isValidCpf(input.cpf)) errors.cpf = "CPF inválido.";
  if (input.phone.replace(/\D/g, "").length < 10) errors.phone = "Telefone inválido.";
  return errors;
};

export const validateAddress = (
  input: Omit<AddressInput, "number"> & { number: string },
): FieldErrors<keyof AddressInput> => {
  const errors: FieldErrors<keyof AddressInput> = {};
  if (!required(input.street)) errors.street = "Informe a rua.";
  if (!/^\d+$/.test(input.number.trim())) errors.number = "Informe o número.";
  if (!required(input.neighborhood)) errors.neighborhood = "Escolha o bairro.";
  if (!required(input.city)) errors.city = "Escolha a cidade.";
  return errors;
};

export const validateDeliveryman = (
  input: DeliverymanInput,
  isValidCpf: (cpf: string) => boolean,
): FieldErrors<keyof DeliverymanInput> => {
  const errors: FieldErrors<keyof DeliverymanInput> = {};
  if (!required(input.name)) errors.name = "Informe o nome.";
  if (!required(input.lastName)) errors.lastName = "Informe o sobrenome.";
  if (input.phone.replace(/\D/g, "").length < 10) errors.phone = "Telefone inválido.";
  if (!isValidCpf(input.cpf)) errors.cpf = "CPF inválido.";
  if (!required(input.qualification)) errors.qualification = "Informe o número da CNH.";
  return errors;
};

export const validateProduct = (
  input: Pick<ProductInput, "name" | "price" | "description" | "category">,
): FieldErrors<"name" | "price" | "description" | "category"> => {
  const errors: FieldErrors<"name" | "price" | "description" | "category"> = {};
  if (!required(input.name)) errors.name = "Informe o nome.";
  if (!(input.price > 0)) errors.price = "Informe um preço maior que zero.";
  if (!required(input.description)) errors.description = "Informe a descrição.";
  if (!required(input.category)) errors.category = "Informe a categoria.";
  return errors;
};

// Variações incompletas são descartadas, como no web (o backend recusa atributo/valor vazio).
export const cleanVariations = (variations: readonly ProductVariation[]) =>
  variations
    .map((v) => ({ attribute: v.attribute.trim(), value: v.value.trim() }))
    .filter((v) => v.attribute && v.value);

export const emptyToNull = (value: string) => (value.trim() ? value.trim() : null);
