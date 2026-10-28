import { appRouteForLink } from "./Notification";

describe("Notification", () => {
  it("leva o entregador para a aba Frota e o gestor para a listagem certa", () => {
    expect(appRouteForLink("/cadastros/troca-oleo", true)).toBe("/fleet");
    expect(appRouteForLink("/cadastros/troca-oleo", false)).toBe("/oil-changes");
    expect(appRouteForLink("/listagem-abastecimentos", false)).toBe("/fuel-refills");
  });

  it("chat não tem tela no app", () => {
    expect(appRouteForLink("/chat", false)).toBeNull();
    expect(appRouteForLink("/chat", true)).toBeNull();
  });

  it("ignora links sem tela no app", () => {
    expect(appRouteForLink(null, false)).toBeNull();
    expect(appRouteForLink("/configuracoes/visuais", false)).toBeNull();
  });
});
