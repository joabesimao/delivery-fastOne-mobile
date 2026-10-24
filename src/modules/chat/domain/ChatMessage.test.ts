import {
  canDeleteMessage,
  mergeMessages,
  normalizeOutgoing,
  typingLabel,
  type ChatMessage,
} from "./ChatMessage";

const message = (id: number, minute: number, text = `m${id}`): ChatMessage => ({
  id,
  text,
  image: null,
  createdAt: new Date(2026, 9, 24, 12, minute),
  sender: { id: 1, name: "Ana" },
  unitName: "Matriz",
});

describe("ChatMessage", () => {
  it("junta histórico e mensagens novas sem duplicar e em ordem", () => {
    const merged = mergeMessages(
      [message(1, 1), message(3, 3)],
      [message(2, 2), message(3, 3, "editada")],
    );
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(merged[2]?.text).toBe("editada");
  });

  it("não envia mensagem em branco", () => {
    expect(normalizeOutgoing("   ")).toBeNull();
    expect(normalizeOutgoing("  oi ")).toBe("oi");
  });

  it("descreve quem está digitando", () => {
    expect(typingLabel([])).toBeNull();
    expect(typingLabel(["Ana"])).toBe("Ana está digitando...");
    expect(typingLabel(["Ana", "Bia"])).toBe("2 pessoas estão digitando...");
  });

  it("só o autor ou o admin apagam a mensagem", () => {
    expect(canDeleteMessage(message(1, 1), 1, false)).toBe(true);
    expect(canDeleteMessage(message(1, 1), 2, false)).toBe(false);
    expect(canDeleteMessage(message(1, 1), 2, true)).toBe(true);
    expect(canDeleteMessage(message(1, 1), null, false)).toBe(false);
  });
});
