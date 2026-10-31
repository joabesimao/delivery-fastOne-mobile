import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  HelperText,
  Chip as PaperChip,
  Switch,
  TextInput as PaperTextInput,
  TouchableRipple,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDate } from "./format";
import { GroupedItem, GroupSeparator, IconButton } from "./layout";
import { makeStyles, useTheme } from "./ThemeProvider";
import { font, radius, spacing } from "./theme";
import { Button, EmptyState, paperIcon, type IconName } from "./ui";

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
    <>
      <PickerField
        label={label}
        text={loading ? "Carregando..." : (selected?.label ?? placeholder)}
        placeholder={!loading && !selected}
        icon="chevron-down"
        error={error}
        onPress={() => setOpen(true)}
      />

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={[styles.modal, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <IconButton icon="close" label="Fechar" onPress={close} />
          </View>
          {options.length > 8 ? (
            <SearchField value={query} onChangeText={setQuery} autoFocus />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            ItemSeparatorComponent={GroupSeparator}
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
            renderItem={({ item, index }) => {
              const isSelected = item.value === value;
              return (
                <GroupedItem index={index} count={filtered.length}>
                  <TouchableRipple
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    style={styles.option}
                  >
                    <>
                      <View style={styles.flex}>
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {item.label}
                        </Text>
                        {item.description ? (
                          <Text style={styles.optionDescription}>{item.description}</Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </>
                  </TouchableRipple>
                </GroupedItem>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

// Campo só de leitura com o mesmo contorno do TextField; o toque abre o seletor.
function PickerField({
  label,
  text,
  placeholder,
  icon,
  error,
  onPress,
}: {
  label: string;
  text: string;
  placeholder?: boolean;
  icon: IconName;
  error?: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={onPress}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <PaperTextInput
            mode="outlined"
            label={label}
            value={text}
            editable={false}
            error={Boolean(error)}
            textColor={placeholder ? colors.textSubtle : undefined}
            right={<PaperTextInput.Icon icon={paperIcon(icon)} />}
            outlineStyle={styles.outline}
            style={styles.pickerInput}
          />
        </View>
      </Pressable>
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
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
    <PickerField label={label} text={formatDate(value)} icon="calendar-outline" onPress={open} />
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
        color={colors.primary}
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
  return (
    <PaperChip
      mode="outlined"
      compact
      selected={selected}
      showSelectedCheck={false}
      onPress={onPress}
      icon={icon ? paperIcon(icon) : undefined}
      style={[styles.chip, selected && styles.chipSelected]}
      textStyle={[styles.chipText, selected && styles.chipTextSelected]}
    >
      {label}
    </PaperChip>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: spacing.sm },
  field: { gap: spacing.xs },
  label: { fontSize: font.small, color: colors.textMuted },
  outline: { borderRadius: radius.sm },
  pickerInput: { fontSize: font.body, backgroundColor: colors.surface },
  iosDate: { alignItems: "flex-start" },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: font.title, fontWeight: "600", color: colors.text },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: { fontSize: font.body, color: colors.text },
  optionTextSelected: { fontSize: font.body, fontWeight: "500", color: colors.primary },
  optionDescription: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: { borderRadius: radius.sm, borderColor: colors.borderStrong },
  chipSelected: { borderColor: colors.primaryBorder },
  chipText: { fontSize: font.small, fontWeight: "500", color: colors.textMuted },
  chipTextSelected: { fontSize: font.small, fontWeight: "500", color: colors.onPrimarySoft },
}));
