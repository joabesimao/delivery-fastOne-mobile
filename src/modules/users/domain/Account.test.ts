import { validateAccount } from "./Account";

describe("Account", () => {
  const base = { name: "Ana", email: "ana@fastone.com", password: "", confirmation: "" };

  it("exige senha ao criar, com o mínimo do backend", () => {
    expect(validateAccount(base, true)).toEqual({
      password: "A senha precisa de pelo menos 8 caracteres.",
    });
    expect(
      validateAccount({ ...base, password: "12345678", confirmation: "12345678" }, true),
    ).toEqual({});
  });

  it("na edição a senha é opcional, mas precisa conferir quando informada", () => {
    expect(validateAccount(base, false)).toEqual({});
    expect(validateAccount({ ...base, password: "12345678", confirmation: "x" }, false)).toEqual({
      confirmation: "As senhas não conferem.",
    });
  });

  it("valida nome e e-mail", () => {
    expect(validateAccount({ ...base, name: " ", email: "ana" }, false)).toEqual({
      name: "Informe o nome.",
      email: "Informe um e-mail válido.",
    });
  });
});
