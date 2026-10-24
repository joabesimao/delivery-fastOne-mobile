import { useRealtimeAccount } from "@/main/realtimeSession";
import { formatDateTime } from "@/shared/format";
import { colors, font, radius, spacing } from "@/shared/theme";
import { Banner, EmptyState, LoadingState } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MAX_MESSAGE_LENGTH, typingLabel, type ChatMessage } from "../domain/ChatMessage";
import { useChat } from "./useChat";

export function ChatScreen() {
  const account = useRealtimeAccount();
  const { status, messages, historyLoaded, typingNames, send, notifyTyping } = useChat();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista invertida: a mensagem mais nova fica embaixo, junto do campo de texto.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const connected = status === "connected";
  const typing = typingLabel(typingNames);

  const submit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await send(draft);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {!connected ? <Banner tone="info" message="Conectando ao chat em tempo real..." /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      {!historyLoaded && connected ? (
        <LoadingState message="Carregando mensagens..." />
      ) : (
        <FlatList
          inverted
          data={inverted}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Bubble message={item} mine={item.sender.id === account?.id} />}
          ListEmptyComponent={
            historyLoaded ? (
              <View style={styles.emptyWrap}>
                <EmptyState icon="chatbubbles-outline" title="Nenhuma mensagem ainda" />
              </View>
            ) : undefined
          }
        />
      )}

      {typing ? <Text style={styles.typing}>{typing}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (connected && text) notifyTyping();
          }}
          placeholder={connected ? "Mensagem" : "Aguardando conexão..."}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={connected}
          accessibilityLabel="Mensagem"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          disabled={!connected || !draft.trim() || sending}
          onPress={submit}
          style={({ pressed }) => [
            styles.send,
            (!connected || !draft.trim()) && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const Bubble = memo(function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!mine ? (
          <Text style={styles.sender}>
            {message.sender.name}
            {message.unitName ? ` · ${message.unitName}` : ""}
          </Text>
        ) : null}
        {message.text ? (
          <Text style={[styles.text, mine && styles.textMine]}>{message.text}</Text>
        ) : null}
        {message.hasImage ? (
          <Text style={[styles.image, mine && styles.textMine]}>
            📷 Imagem (veja no painel web)
          </Text>
        ) : null}
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatDateTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  emptyWrap: { flex: 1, transform: [{ scaleY: -1 }] },
  bubbleRow: { flexDirection: "row", justifyContent: "flex-start" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: radius.md, padding: spacing.md, gap: 2 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  sender: { fontSize: font.caption, fontWeight: "700", color: colors.primary },
  text: { fontSize: font.body, color: colors.text },
  textMine: { color: colors.white },
  image: { fontSize: font.small, fontStyle: "italic", color: colors.textMuted },
  time: { fontSize: 11, color: colors.textSubtle, alignSelf: "flex-end" },
  timeMine: { color: "rgba(255,255,255,0.75)" },
  typing: {
    fontSize: font.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    fontSize: font.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});
