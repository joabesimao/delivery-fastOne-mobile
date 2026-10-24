import { parseChatHistory, parseChatMessage, parseDeletedId } from "./chatEvents";

describe("chatEvents", () => {
  it("descarta itens inválidos do histórico do socket", () => {
    const history = parseChatHistory([
      { id: 1, text: "oi", createdAt: "2026-10-24T12:00:00Z", sender: { id: 2, name: "Bia" } },
      { id: "x" },
    ]);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: 1, text: "oi", hasImage: false, unitName: "" });
  });

  it("marca mensagens com imagem sem carregar o base64 na entidade", () => {
    const message = parseChatMessage({
      id: 2,
      text: null,
      imageBase64: "AAAA",
      createdAt: "2026-10-24T12:00:00Z",
      sender: { id: 2, name: "Bia" },
      unitStore: { name: "Filial" },
    });
    expect(message).toMatchObject({ hasImage: true, text: null, unitName: "Filial" });
    expect(message).not.toHaveProperty("imageBase64");
  });

  it("lê o id da mensagem apagada", () => {
    expect(parseDeletedId({ messageId: 5 })).toBe(5);
    expect(parseDeletedId({})).toBeNull();
  });
});
