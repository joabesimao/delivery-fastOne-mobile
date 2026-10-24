import {
  base64Bytes,
  cleanVariations,
  emptyToNull,
  formatClientAddress,
  validateAddress,
  validateClient,
  validateDeliveryman,
  validateProduct,
} from "./Catalog";

const validCpf = () => true;
const invalidCpf = () => false;

describe("Catalog", () => {
  it("valida cliente: nome, CPF e telefone", () => {
    expect(
      validateClient({ name: "Ana", cpf: "52998224725", phone: "61999990000" }, validCpf),
    ).toEqual({});
    expect(validateClient({ name: " ", cpf: "1", phone: "123" }, invalidCpf)).toEqual({
      name: "Informe o nome do cliente.",
      cpf: "CPF inválido.",
      phone: "Telefone inválido.",
    });
  });

  it("valida endereço com número só de dígitos", () => {
    const address = {
      street: "Rua A",
      number: "10",
      neighborhood: "Centro",
      city: "Brasília",
      reference: "",
    };
    expect(validateAddress(address)).toEqual({});
    expect(validateAddress({ ...address, number: "10A", neighborhood: "" })).toEqual({
      number: "Informe o número.",
      neighborhood: "Escolha o bairro.",
    });
  });

  it("valida entregador com todos os campos exigidos pelo backend", () => {
    const errors = validateDeliveryman(
      { name: "Carlos", lastName: "", phone: "61988887777", cpf: "x", qualification: "" },
      invalidCpf,
    );
    expect(Object.keys(errors).sort()).toEqual(["cpf", "lastName", "qualification"]);
  });

  it("valida produto com preço positivo", () => {
    expect(
      validateProduct({ name: "Gás", price: 120, description: "P13", category: "Gás" }),
    ).toEqual({});
    expect(validateProduct({ name: "Gás", price: 0, description: "P13", category: "Gás" })).toEqual(
      {
        price: "Informe um preço maior que zero.",
      },
    );
  });

  it("descarta variações incompletas e apara espaços", () => {
    expect(
      cleanVariations([
        { attribute: " Cor ", value: " Azul " },
        { attribute: "Tamanho", value: " " },
      ]),
    ).toEqual([{ attribute: "Cor", value: "Azul" }]);
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull(" x ")).toBe("x");
  });

  it("estima o tamanho do base64 descontando o padding", () => {
    expect(base64Bytes("AAAA")).toBe(3);
    expect(base64Bytes("AAA=")).toBe(2);
  });

  it("formata o endereço do cliente", () => {
    expect(formatClientAddress(null)).toBe("Sem endereço");
    expect(
      formatClientAddress({
        street: "Rua A",
        number: 10,
        neighborhood: "Centro",
        city: "Brasília",
        reference: "",
      }),
    ).toBe("Rua A, 10 · Centro, Brasília");
  });
});
