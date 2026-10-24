export interface ChatMessage {
  id: number;
  text: string | null;
  image: { base64: string; mimeType: string } | null;
  createdAt: Date;
  sender: { id: number; name: string };
  unitName: string;
}

export interface TypingEvent {
  accountId: number;
  name: string;
  isTyping: boolean;
}

export const MAX_MESSAGE_LENGTH = 2000;

// Dono da mensagem ou admin podem apagar (mesma regra do socket).
export const canDeleteMessage = (
  message: Pick<ChatMessage, "sender">,
  accountId: number | null,
  isAdmin: boolean,
) => isAdmin || (accountId !== null && message.sender.id === accountId);

export interface ChatSearchPage {
  messages: ChatMessage[];
  total: number;
}

export const normalizeOutgoing = (text: string): string | null => {
  const trimmed = text.trim();
  return trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : null;
};

// O histórico chega inteiro na conexão e as novas uma a uma: junta sem duplicar e em ordem.
export const mergeMessages = (
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] => {
  const byId = new Map<number, ChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

export const typingLabel = (names: readonly string[]): string | null => {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} está digitando...`;
  return `${names.length} pessoas estão digitando...`;
};
