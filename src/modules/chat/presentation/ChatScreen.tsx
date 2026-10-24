import { useRealtimeAccount } from "@/main/realtimeSession";
import { isAdmin } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { formatDateTime } from "@/shared/format";
import { confirm } from "@/shared/layout";
import { imageUri, pickImage, type PickedImage } from "@/shared/pickImage";
import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { font, radius, spacing } from "@/shared/theme";
import { Banner, EmptyState, LoadingState } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  canDeleteMessage,
  MAX_MESSAGE_LENGTH,
  typingLabel,
  type ChatMessage,
} from "../domain/ChatMessage";
import { useChat } from "./useChat";

export function ChatScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const account = useRealtimeAccount();
  const { role } = useSession();
  const { status, messages, historyLoaded, typingNames, send, remove, notifyTyping } = useChat();
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<PickedImage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // Lista invertida: a mensagem mais nova fica embaixo, junto do campo de texto.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const connected = status === "connected";
  const typing = typingLabel(typingNames);
  const canSend = connected && (Boolean(draft.trim()) || attachment !== null);
  const accountId = account?.id ?? null;
  const admin = isAdmin(role);

  const submit = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError(null);
    try {
      await send(draft, attachment ?? undefined);
      setDraft("");
      setAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    const image = await pickImage();
    if (image) setAttachment(image);
  };

  const askDelete = async (message: ChatMessage) => {
    if (!canDeleteMessage(message, accountId, admin)) return;
    if (!(await confirm("Apagar mensagem?", "Ela some para todos no chat.", "Apagar"))) return;
    try {
      await remove(message.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar.");
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
          renderItem={({ item }) => (
            <Bubble
              message={item}
              mine={item.sender.id === accountId}
              onLongPress={askDelete}
              onOpenImage={setViewing}
            />
          )}
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

      {attachment ? (
        <View style={styles.attachment}>
          <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
          <Text style={styles.attachmentText}>Imagem anexada</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remover imagem"
            onPress={() => setAttachment(null)}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anexar imagem"
          disabled={!connected || sending}
          onPress={attach}
          style={({ pressed }) => [styles.attach, pressed && styles.pressed]}
        >
          <Ionicons name="image-outline" size={22} color={colors.primary} />
        </Pressable>
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
          disabled={!canSend || sending}
          onPress={submit}
          style={({ pressed }) => [
            styles.send,
            !canSend && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          )}
        </Pressable>
      </View>

      <Modal
        visible={viewing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewing(null)}
      >
        <Pressable
          style={styles.viewer}
          accessibilityRole="button"
          accessibilityLabel="Fechar imagem"
          onPress={() => setViewing(null)}
        >
          {viewing ? (
            <Image source={{ uri: viewing }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export const Bubble = memo(function Bubble({
  message,
  mine,
  onLongPress,
  onOpenImage,
}: {
  message: ChatMessage;
  mine: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onOpenImage?: (uri: string) => void;
}) {
  const styles = useStyles();
  const uri = message.image ? imageUri(message.image) : null;
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <Pressable
        onLongPress={onLongPress ? () => onLongPress(message) : undefined}
        delayLongPress={350}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
      >
        {!mine ? (
          <Text style={styles.sender}>
            {message.sender.name}
            {message.unitName ? ` · ${message.unitName}` : ""}
          </Text>
        ) : null}
        {uri ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Abrir imagem"
            onPress={onOpenImage ? () => onOpenImage(uri) : undefined}
          >
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ) : null}
        {message.text ? (
          <Text style={[styles.text, mine && styles.textMine]}>{message.text}</Text>
        ) : null}
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatDateTime(message.createdAt)}
        </Text>
      </Pressable>
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  emptyWrap: { flex: 1, transform: [{ scaleY: -1 }] },
  bubbleRow: { flexDirection: "row", justifyContent: "flex-start" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: radius.md, padding: spacing.md, gap: 4 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  sender: { fontSize: font.caption, fontWeight: "700", color: colors.primary },
  text: { fontSize: font.body, color: colors.text },
  textMine: { color: colors.onPrimary },
  image: { width: 220, height: 220, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  time: { fontSize: 11, color: colors.textSubtle, alignSelf: "flex-end" },
  timeMine: { color: "rgba(255,255,255,0.75)" },
  typing: {
    fontSize: font.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  attachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentImage: { width: 44, height: 44, borderRadius: radius.sm },
  attachmentText: { flex: 1, fontSize: font.small, color: colors.textMuted },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attach: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "80%" },
}));
