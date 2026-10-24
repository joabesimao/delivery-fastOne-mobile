import { parseChatHistory, parseChatMessage, parseDeletedId } from "./chatEvents";

describe("chatEvents", () => {
  it("descarta itens inválidos do histórico do socket", () => {
    const history = parseChatHistory([
      { id: 1, text: "oi", createdAt: "2026-10-24T12:00:00Z", sender: { id: 2, name: "Bia" } },
      { id: "x" },
    ]);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: 1, text: "oi", image: null, unitName: "" });
  });

  it("lê a imagem da mensagem com o tipo informado", () => {
    const message = parseChatMessage({
      id: 2,
      text: null,
      imageBase64: "AAAA",
      createdAt: "2026-10-24T12:00:00Z",
      sender: { id: 2, name: "Bia" },
      unitStore: { name: "Filial" },
    });
    expect(message).toMatchObject({
      image: { base64: "AAAA", mimeType: "image/jpeg" },
      text: null,
      unitName: "Filial",
    });
  });

  it("lê o id da mensagem apagada", () => {
    expect(parseDeletedId({ messageId: 5 })).toBe(5);
    expect(parseDeletedId({})).toBeNull();
  });
});
