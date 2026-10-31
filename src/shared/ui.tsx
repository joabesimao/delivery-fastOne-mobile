import { makeStyles, useTheme } from "./ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextInputInstance,
  type ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Button as PaperButton,
  HelperText,
  TextInput as PaperTextInput,
  type TextInputProps as PaperTextInputProps,
} from "react-native-paper";
import { font, fontFamily, radius, spacing } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// Os componentes do Paper usam Material Community Icons; o app usa Ionicons.
export const paperIcon = (name: IconName) => {
  const PaperIcon = ({ size, color }: { size: number; color: string }) => (
    <Ionicons name={name} size={size} color={color} />
  );
  return PaperIcon;
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Só a ação principal da tela é "primary" (preenchido); o resto fica em contorno ou texto.
const buttonMode = {
  primary: "contained",
  secondary: "outlined",
  danger: "outlined",
  ghost: "text",
} as const;

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const danger = variant === "danger";
  return (
    <PaperButton
      mode={buttonMode[variant]}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon && !loading ? paperIcon(icon) : undefined}
      buttonColor={variant === "primary" ? colors.primaryFill : undefined}
      textColor={danger ? colors.danger : undefined}
      style={[danger && styles.dangerButton, style]}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonLabel}
    >
      {title}
    </PaperButton>
  );
}

// Mesmo recorte que o TextInput do Paper expõe pela ref.
export type TextFieldHandle = Pick<TextInputInstance, "focus" | "blur" | "clear" | "isFocused">;

interface TextFieldProps extends Omit<
  PaperTextInputProps,
  "ref" | "label" | "error" | "mode" | "left" | "right"
> {
  label: string;
  error?: string;
  prefix?: string;
  // Ícone com ação no fim do campo (ex.: mostrar senha).
  action?: { icon: IconName; label: string; onPress: () => void };
  ref?: Ref<TextFieldHandle>;
}

export function TextField({
  label,
  error,
  prefix,
  action,
  style,
  ref,
  ...inputProps
}: TextFieldProps) {
  const styles = useStyles();
  return (
    <View>
      <PaperTextInput
        // O tipo do Paper exige a ref nativa e a dele ao mesmo tempo; a instância é a do Paper.
        ref={ref as never}
        mode="outlined"
        label={label}
        error={Boolean(error)}
        left={prefix ? <PaperTextInput.Affix text={prefix} /> : undefined}
        right={
          action ? (
            <PaperTextInput.Icon
              icon={paperIcon(action.icon)}
              onPress={action.onPress}
              accessibilityLabel={action.label}
            />
          ) : undefined
        }
        outlineStyle={styles.outline}
        style={[styles.input, style]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

// Status como ponto colorido + texto, sem pílula.
export function Badge({ label, color }: { label: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

// Abas de texto com sublinhado (não o SegmentedButtons do Material). Contagem em mono.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              option.count !== undefined ? `${option.label}, ${option.count}` : option.label
            }
            onPress={() => onChange(option.value)}
            hitSlop={{ top: 8, bottom: 8 }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text style={[styles.segmentCount, selected && styles.segmentCountSelected]}>
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Par rótulo/valor numa linha só, para usar dentro de ListGroup (detalhes, perfil).
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {action}
    </View>
  );
}

export function LoadingState({ message = "Carregando..." }: { message?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  description,
}: {
  icon?: IconName;
  title: string;
  description?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={20} color={colors.textSubtle} />
      <Text style={styles.stateTitle}>{title}</Text>
      {description ? <Text style={styles.stateText}>{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
      <Text style={styles.stateTitle}>Não foi possível carregar</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Button title="Tentar novamente" variant="secondary" icon="refresh" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function Banner({ tone, message }: { tone: "error" | "success" | "info"; message: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = {
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: "alert-circle" as const },
    success: { bg: colors.successSoft, fg: colors.success, icon: "checkmark-circle" as const },
    info: { bg: colors.primarySoft, fg: colors.primary, icon: "information-circle" as const },
  }[tone];

  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  buttonContent: { minHeight: 48 },
  buttonLabel: { fontSize: font.body, fontWeight: "500" },
  dangerButton: { borderColor: colors.dangerBorder },
  outline: { borderRadius: radius.sm },
  input: { fontSize: font.body, backgroundColor: colors.surface },
  badge: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: font.small, fontWeight: "500", color: colors.text },
  segmented: {
    flexDirection: "row",
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  segmentSelected: { borderBottomColor: colors.primary },
  segmentLabel: { fontSize: font.small + 1, fontWeight: "500", color: colors.textMuted },
  segmentLabelSelected: { fontSize: font.small + 1, fontWeight: "600", color: colors.text },
  segmentCount: { fontFamily: fontFamily.mono, fontSize: font.caption, color: colors.textSubtle },
  segmentCountSelected: {
    fontFamily: fontFamily.mono,
    fontSize: font.caption,
    color: colors.primary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  detailLabel: { fontSize: font.body, color: colors.textMuted },
  detailValue: {
    flexShrink: 1,
    fontSize: font.body,
    fontWeight: "500",
    color: colors.text,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    marginTop: spacing.md,
  },
  // Rótulo de seção em caixa alta e espaçado, como em painel de operação.
  sectionTitleText: {
    fontSize: font.caption - 1,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  centered: {
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingTop: 56,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  stateTitle: { fontSize: font.body, fontWeight: "600", color: colors.text, textAlign: "center" },
  stateText: { fontSize: font.small, color: colors.textMuted, textAlign: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  bannerText: { flex: 1, fontSize: font.small, fontWeight: "500" },
}));
