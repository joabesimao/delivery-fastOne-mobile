import { container } from "@/main/container";
import { useRealtimeStatus } from "@/main/realtimeSession";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeMessages,
  normalizeOutgoing,
  type ChatMessage,
  type TypingEvent,
} from "../domain/ChatMessage";
import {
  CHAT_EVENTS,
  parseChatHistory,
  parseChatMessage,
  parseDeletedId,
  sendAckSchema,
} from "../infra/chatEvents";

const { realtime } = container;

const TYPING_IDLE_MS = 3_000;

// O socket responde { ok, error } no ack; erro vira exceção com a mensagem do servidor.
const emitChecked = async (event: string, payload: unknown) => {
  const ack = sendAckSchema.safeParse(await realtime.emitWithAck(event, payload));
  if (!ack.success || !ack.data.ok) {
    throw new Error(
      ack.success ? (ack.data.error ?? "Falha na operação.") : "Resposta inválida do servidor.",
    );
  }
};

export const useChat = () => {
  const status = useRealtimeStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [typing, setTyping] = useState<Record<number, string>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribers = [
      realtime.on(CHAT_EVENTS.history, (payload: unknown) => {
        setMessages((current) => mergeMessages(current, parseChatHistory(payload)));
        setHistoryLoaded(true);
      }),
      realtime.on(CHAT_EVENTS.message, (payload: unknown) => {
        const message = parseChatMessage(payload);
        if (!message) return;
        setMessages((current) => mergeMessages(current, [message]));
        setTyping(({ [message.sender.id]: _removed, ...rest }) => rest);
      }),
      realtime.on(CHAT_EVENTS.deleted, (payload: unknown) => {
        const id = parseDeletedId(payload);
        if (id !== null) setMessages((current) => current.filter((m) => m.id !== id));
      }),
      realtime.on(CHAT_EVENTS.typing, (payload: TypingEvent) => {
        if (typeof payload?.accountId !== "number") return;
        setTyping(({ [payload.accountId]: _removed, ...rest }) =>
          payload.isTyping ? { ...rest, [payload.accountId]: payload.name } : rest,
        );
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  // O histórico chega sozinho na conexão; quem abre a tela depois pede de novo.
  useEffect(() => {
    if (status === "connected") realtime.emit("chat:fetch-history");
  }, [status]);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    realtime.emit(CHAT_EVENTS.typing, { isTyping: false });
  }, []);

  const notifyTyping = useCallback(() => {
    if (!typingTimer.current) realtime.emit(CHAT_EVENTS.typing, { isTyping: true });
    else clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [stopTyping]);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    [],
  );

  const send = useCallback(
    async (text: string, image?: { base64: string; mimeType: string }) => {
      const normalized = normalizeOutgoing(text);
      if (!normalized && !image) return;
      stopTyping();
      await emitChecked(CHAT_EVENTS.send, {
        ...(normalized && { text: normalized }),
        ...(image && { imageBase64: image.base64, imageMimeType: image.mimeType }),
      });
    },
    [stopTyping],
  );

  const remove = useCallback(async (messageId: number) => {
    await emitChecked(CHAT_EVENTS.remove, { messageId });
    // O servidor também avisa por chat:message-deleted; tirar já evita esperar o evento.
    setMessages((current) => current.filter((m) => m.id !== messageId));
  }, []);

  return {
    status,
    messages,
    historyLoaded,
    typingNames: Object.values(typing),
    send,
    remove,
    notifyTyping,
  };
};
