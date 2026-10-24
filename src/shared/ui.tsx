import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, font, radius, spacing } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
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

const buttonPalette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: "#FECACA" },
  ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const palette = buttonPalette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  prefix?: string;
  ref?: Ref<TextInputInstance>;
}

export function TextField({ label, error, prefix, style, ref, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, error ? styles.inputError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Badge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.label}
              {option.count !== undefined ? ` (${option.count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.infoIcon} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        {typeof value === "string" ? <Text style={styles.infoValue}>{value}</Text> : value}
      </View>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {action}
    </View>
  );
}

export function LoadingState({ message = "Carregando..." }: { message?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.primary} size="large" />
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
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={44} color={colors.textSubtle} />
      <Text style={styles.stateTitle}>{title}</Text>
      {description ? <Text style={styles.stateText}>{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={styles.stateTitle}>Não foi possível carregar</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Button title="Tentar novamente" variant="secondary" icon="refresh" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function Banner({ tone, message }: { tone: "error" | "success" | "info"; message: string }) {
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonText: { fontSize: font.body, fontWeight: "600" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  field: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  inputBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  prefix: { fontSize: font.body, color: colors.textMuted, marginRight: spacing.xs },
  input: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: spacing.md },
  errorText: { fontSize: font.caption, color: colors.danger },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  badgeText: { fontSize: font.caption, fontWeight: "700" },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm - 2,
  },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  segmentTextSelected: { color: colors.text },
  infoRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  infoIcon: { marginTop: 2 },
  infoLabel: {
    fontSize: font.caption,
    fontWeight: "600",
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  infoValue: { fontSize: font.body, color: colors.text, marginTop: 2 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitleText: { fontSize: font.title, fontWeight: "700", color: colors.text },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  stateTitle: { fontSize: font.title, fontWeight: "700", color: colors.text, textAlign: "center" },
  stateText: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  bannerText: { flex: 1, fontSize: font.small, fontWeight: "500" },
});
