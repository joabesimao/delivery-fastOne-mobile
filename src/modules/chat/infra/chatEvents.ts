import { z } from "zod";
import type { ChatMessage } from "../domain/ChatMessage";

export const CHAT_EVENTS = {
  history: "chat:history",
  message: "chat:message",
  deleted: "chat:message-deleted",
  typing: "chat:typing",
  send: "chat:send",
} as const;

const messageSchema = z.object({
  id: z.number(),
  text: z.string().nullish(),
  imageBase64: z.string().nullish(),
  createdAt: z.string(),
  sender: z.object({ id: z.number(), name: z.string() }),
  unitStore: z.object({ name: z.string() }).nullish(),
});

const toChatMessage = (dto: z.infer<typeof messageSchema>): ChatMessage => ({
  id: dto.id,
  text: dto.text ?? null,
  hasImage: Boolean(dto.imageBase64),
  createdAt: new Date(dto.createdAt),
  sender: dto.sender,
  unitName: dto.unitStore?.name ?? "",
});

// Eventos do socket chegam sem garantia de formato: mensagem inválida é descartada, não derruba o chat.
export const parseChatMessage = (payload: unknown): ChatMessage | null => {
  const parsed = messageSchema.safeParse(payload);
  return parsed.success ? toChatMessage(parsed.data) : null;
};

export const parseChatHistory = (payload: unknown): ChatMessage[] =>
  Array.isArray(payload)
    ? payload.map(parseChatMessage).filter((m): m is ChatMessage => m !== null)
    : [];

export const parseDeletedId = (payload: unknown): number | null => {
  const parsed = z.object({ messageId: z.number() }).safeParse(payload);
  return parsed.success ? parsed.data.messageId : null;
};

export const sendAckSchema = z.object({ ok: z.boolean(), error: z.string().optional() });
