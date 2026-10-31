import Ionicons from "@expo/vector-icons/Ionicons";
import { Children, type ReactElement, type ReactNode } from "react";
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
import { Divider, FAB, IconButton as PaperIconButton, TouchableRipple } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "./ThemeProvider";
import { font, radius, spacing } from "./theme";
import { EmptyState, ErrorState, LoadingState, paperIcon, type IconName } from "./ui";

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

// Campos curtos lado a lado (rua + número, litros + preço). `weights` define a largura relativa.
export function FieldRow({ children, weights }: { children: ReactNode; weights?: number[] }) {
  const styles = useStyles();
  return (
    <View style={styles.fieldRow}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={{ flex: weights?.[index] ?? 1 }}>
          {child}
        </View>
      ))}
    </View>
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
    <TouchableRipple
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(", ")}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={[styles.row, muted && styles.muted]}
    >
      <>
        {icon ? <Ionicons name={icon} size={20} color={colors.textMuted} /> : null}
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
      </>
    </TouchableRipple>
  );
}

// Linhas soltas (fora de FlatList) agrupadas numa superfície só, com divisórias.
export function ListGroup({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <Divider style={styles.groupDivider} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

// Item de FlatList agrupada: mesma superfície do ListGroup, cantos só nas pontas.
export function GroupedItem({
  index,
  count,
  children,
}: {
  index: number;
  count: number;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.groupItem,
        index === 0 && styles.groupFirst,
        index === count - 1 && styles.groupLast,
      ]}
    >
      {children}
    </View>
  );
}

export function GroupSeparator() {
  const styles = useStyles();
  return (
    <View style={styles.groupItem}>
      <Divider style={styles.groupDivider} />
    </View>
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
    <FAB
      label={label}
      icon={paperIcon(icon)}
      onPress={onPress}
      color={colors.onPrimary}
      style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
    />
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
  const { colors } = useTheme();
  const color = { default: colors.textMuted, danger: colors.danger, primary: colors.primary }[tone];
  return (
    <PaperIconButton
      icon={paperIcon(icon)}
      iconColor={color}
      size={20}
      accessibilityLabel={label}
      onPress={onPress}
    />
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
  hint,
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
  // Linha discreta sob o cabeçalho, ex.: "Segure um item para excluir".
  hint?: string | null;
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
        renderItem={(info) => (
          <GroupedItem index={info.index} count={items.length}>
            {renderItem(info)}
          </GroupedItem>
        )}
        contentContainerStyle={[styles.list, fab ? styles.listWithFab : null]}
        ListHeaderComponent={
          header || (hint && items.length > 0) ? (
            <>
              {header}
              {hint && items.length > 0 ? <Text style={styles.hint}>{hint}</Text> : null}
            </>
          ) : undefined
        }
        ListHeaderComponentStyle={styles.listHeader}
        ItemSeparatorComponent={GroupSeparator}
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
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

// Uma superfície só, com divisórias internas, em vez de um card por número.
// A margem negativa esconde a borda direita/inferior das células da última coluna/linha.
export function StatGrid({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.statGrid}>
      <View style={styles.statCells}>{children}</View>
    </View>
  );
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
            <IconButton icon="close" label="Fechar" onPress={onClose} />
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
  fieldRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  screen: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  muted: { opacity: 0.6 },
  rowTitle: { fontSize: font.body, fontWeight: "500", color: colors.text },
  rowSubtitle: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  rowMeta: { fontSize: font.caption, color: colors.textSubtle, marginTop: 2 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  groupItem: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  groupFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  groupLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  groupDivider: { marginLeft: spacing.lg, backgroundColor: colors.border },
  fab: {
    position: "absolute",
    right: spacing.lg,
    backgroundColor: colors.primaryFill,
    borderRadius: radius.md,
  },
  list: { padding: spacing.lg, flexGrow: 1 },
  listWithFab: { paddingBottom: 96 },
  hint: { fontSize: font.caption, color: colors.textSubtle },
  listHeader: { marginBottom: spacing.md, gap: spacing.md },
  stat: {
    width: "50%",
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: font.title + 2,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: { fontSize: font.small, color: colors.textMuted },
  statHint: { fontSize: font.caption, color: colors.textSubtle },
  statGrid: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  statCells: { flexDirection: "row", flexWrap: "wrap", marginRight: -1, marginBottom: -1 },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: font.title, fontWeight: "600", color: colors.text },
  sheetFooter: { flexDirection: "row", gap: spacing.md },
}));
