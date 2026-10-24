import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDate } from "./format";
import { makeStyles, useTheme } from "./ThemeProvider";
import { font, radius, spacing } from "./theme";
import { Button, EmptyState, type IconName } from "./ui";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Busca sem acento e sem diferenciar maiúsculas, igual à do painel web.
export const includesText = (haystack: readonly (string | null | undefined)[], term: string) => {
  const query = normalize(term.trim());
  if (!query) return true;
  return normalize(haystack.filter(Boolean).join(" ")).includes(query);
};

export function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar",
  autoFocus,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.searchInput}
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          hitSlop={8}
          onPress={() => onChangeText("")}
        >
          <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

// Campo de escolha que abre uma lista com busca (substitui o Autocomplete do web).
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  error,
  allowClear,
  loading,
}: {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T | null) => void;
  placeholder?: string;
  error?: string;
  allowClear?: boolean;
  loading?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(
    () => options.filter((o) => includesText([o.label, o.description], query)),
    [options, query],
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.box, error ? styles.boxError : null]}
      >
        <Text style={[styles.boxText, !selected && styles.placeholder]} numberOfLines={1}>
          {loading ? "Carregando..." : (selected?.label ?? placeholder)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={[styles.modal, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={close}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          {options.length > 8 ? (
            <SearchField value={query} onChangeText={setQuery} autoFocus />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            ListHeaderComponent={
              allowClear && value !== null ? (
                <Button
                  title="Limpar seleção"
                  variant="ghost"
                  onPress={() => {
                    onChange(null);
                    close();
                  }}
                />
              ) : undefined
            }
            ListEmptyComponent={<EmptyState title="Nada encontrado" />}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.optionText}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.optionDescription}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();

  if (Platform.OS === "ios") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iosDate}>
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            locale="pt-BR"
            themeVariant={scheme}
            accentColor={colors.primary}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onValueChange={(_event, date) => onChange(date)}
          />
        </View>
      </View>
    );
  }

  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      maximumDate,
      minimumDate,
      onValueChange: (_event, date) => onChange(date),
    });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        onPress={open}
        style={styles.box}
      >
        <Text style={styles.boxText}>{formatDate(value)}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={styles.optionText}>{label}</Text>
        {description ? <Text style={styles.optionDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.primary : colors.textMuted} />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  search: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: spacing.sm },
  field: { gap: spacing.xs },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  box: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  boxError: { borderColor: colors.danger },
  boxText: { flex: 1, fontSize: font.body, color: colors.text },
  placeholder: { color: colors.textSubtle },
  error: { fontSize: font.caption, color: colors.danger },
  iosDate: { alignItems: "flex-start" },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: font.title, fontWeight: "700", color: colors.text },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { fontSize: font.body, fontWeight: "600", color: colors.text },
  optionDescription: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  chipTextSelected: { color: colors.primary },
}));
