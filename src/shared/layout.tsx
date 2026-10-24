import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactElement, ReactNode } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "./ThemeProvider";
import { font, radius, spacing } from "./theme";
import { EmptyState, ErrorState, LoadingState, type IconName } from "./ui";

// Tela de formulário: rolagem que respeita o teclado e rodapé fixo com as ações.
export function FormScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const styles = useStyles();
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  right,
  onPress,
  onLongPress,
  muted,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  muted?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(", ")}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, muted && styles.muted]}
    >
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

export function Fab({
  label,
  icon = "add",
  onPress,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + spacing.lg },
        pressed && styles.rowPressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimary} />
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = "default",
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger" | "primary";
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = { default: colors.textMuted, danger: colors.danger, primary: colors.primary }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

interface QueryLike<T> {
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

// Estados de carregamento/erro/vazio iguais em todas as listas de cadastro.
export function ResourceList<T>({
  query,
  items,
  renderItem,
  keyExtractor,
  header,
  emptyTitle,
  emptyDescription,
  errorMessage,
  fab,
}: {
  query: QueryLike<T>;
  items: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  header?: ReactElement;
  emptyTitle: string;
  emptyDescription?: string;
  errorMessage: (error: unknown) => string;
  fab?: ReactElement | null;
}) {
  const styles = useStyles();

  if (query.isLoading) return <LoadingState />;
  if (query.isError && !query.data) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, fab ? styles.listWithFab : null]}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.listHeader}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        ListEmptyComponent={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
      {fab}
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

export function MenuItem({
  icon,
  label,
  description,
  onPress,
}: {
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
}) {
  return <ListRow icon={icon} title={label} subtitle={description} onPress={onPress} />;
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: IconName;
  label: string;
  value: string;
  hint?: string | null;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = {
    primary: [colors.primary, colors.primarySoft],
    success: [colors.success, colors.successSoft],
    warning: [colors.warning, colors.warningSoft],
    danger: [colors.danger, colors.dangerSoft],
  }[tone];
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: palette[1] }]}>
        <Ionicons name={icon} size={18} color={palette[0]} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.statGrid}>{children}</View>;
}

// Formulário curto em folha sobre a lista (cidade, bairro, configurações).
export function FormSheet({
  visible,
  title,
  children,
  onClose,
  footer,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.flex} accessibilityLabel="Fechar" onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {children}
          <View style={styles.sheetFooter}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Confirmação antes de ação destrutiva; resolve true quando o usuário confirma.
export const confirm = (title: string, message: string, confirmLabel = "Excluir") =>
  new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  screen: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowPressed: { opacity: 0.85 },
  muted: { opacity: 0.6 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: font.body, fontWeight: "700", color: colors.text },
  rowSubtitle: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  rowMeta: { fontSize: font.caption, color: colors.textSubtle, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: font.body, fontWeight: "700", color: colors.onPrimary },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: spacing.lg, flexGrow: 1 },
  listWithFab: { paddingBottom: 96 },
  listHeader: { marginBottom: spacing.md, gap: spacing.md },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statValue: { fontSize: font.heading - 2, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: font.small, color: colors.textMuted },
  statHint: { fontSize: font.caption, color: colors.textSubtle },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: font.title, fontWeight: "700", color: colors.text },
  sheetFooter: { flexDirection: "row", gap: spacing.md },
}));
