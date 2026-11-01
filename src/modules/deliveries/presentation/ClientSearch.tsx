import type { Register } from "@/modules/catalog/domain/Catalog";
import { phoneMask } from "@/shared/format";
import { SearchField } from "@/shared/inputs";
import { rankByText, type SearchFields } from "@/shared/textSearch";
import { makeStyles } from "@/shared/ThemeProvider";
import { font, radius, spacing } from "@/shared/theme";
import { Button } from "@/shared/ui";
import { useMemo, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";

const MAX_RESULTS = 8;

const searchFields = (register: Register): SearchFields => ({
  name: register.client.name,
  digits: [register.client.phone, register.client.cpf],
  extra: [register.address.street, register.address.neighborhood, register.address.city],
});

// Busca de cliente digitando direto no formulário: os resultados aparecem enquanto digita,
// sem abrir o seletor em tela cheia. Acha por nome, telefone, CPF ou endereço.
export function ClientSearch({
  registers,
  value,
  onChange,
  error,
  loading,
}: {
  registers: readonly Register[];
  value: number | null;
  onChange: (registerId: number | null) => void;
  error?: string;
  loading?: boolean;
}) {
  const styles = useStyles();
  const [term, setTerm] = useState("");
  // Depois de "Trocar", o campo volta já com o teclado aberto.
  const [focusSearch, setFocusSearch] = useState(false);
  const selected = registers.find((register) => register.id === value);

  const matches = useMemo(() => rankByText(registers, term, searchFields), [registers, term]);
  const results = matches.slice(0, MAX_RESULTS);

  if (selected) {
    return (
      <View style={styles.selected}>
        <View style={styles.flex}>
          <Text style={styles.selectedLabel}>Cliente</Text>
          <Text style={styles.selectedName} numberOfLines={1}>
            {selected.client.name}
          </Text>
        </View>
        <Button
          title="Trocar"
          variant="ghost"
          onPress={() => {
            setTerm("");
            setFocusSearch(true);
            onChange(null);
          }}
        />
      </View>
    );
  }

  const choose = (register: Register) => {
    Keyboard.dismiss();
    setTerm("");
    onChange(register.id);
  };

  return (
    <View style={styles.container}>
      <SearchField
        value={term}
        onChangeText={setTerm}
        placeholder="Nome, telefone ou CPF do cliente"
        autoFocus={focusSearch}
      />
      {error && !term ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <Text style={styles.hint}>Carregando clientes...</Text>
      ) : term.trim() && results.length === 0 ? (
        <Text style={styles.hint}>Nenhum cliente encontrado para “{term.trim()}”.</Text>
      ) : results.length > 0 ? (
        <View style={styles.results} accessibilityRole="list">
          {results.map((register, index) => (
            <Pressable
              key={register.id}
              accessibilityRole="button"
              accessibilityLabel={`Escolher ${register.client.name}`}
              onPress={() => choose(register)}
              style={({ pressed }) => [
                styles.result,
                index > 0 && styles.resultDivider,
                pressed && styles.resultPressed,
              ]}
            >
              <Text style={styles.resultName} numberOfLines={1}>
                {register.client.name}
              </Text>
              <Text style={styles.resultMeta} numberOfLines={1}>
                {phoneMask(register.client.phone)} · {register.address.street},{" "}
                {register.address.number} · {register.address.neighborhood}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {matches.length > MAX_RESULTS ? (
        <Text style={styles.hint}>
          Mostrando {MAX_RESULTS} de {matches.length}. Continue digitando para refinar.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  container: { gap: spacing.sm },
  error: { fontSize: font.small, color: colors.danger },
  hint: { fontSize: font.small, color: colors.textMuted, paddingHorizontal: spacing.xs },
  results: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  result: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2 },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  resultPressed: { backgroundColor: colors.surfacePressed },
  resultName: { fontSize: font.body, fontWeight: "600", color: colors.text },
  resultMeta: { fontSize: font.small, color: colors.textMuted },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedLabel: { fontSize: font.caption, color: colors.textMuted },
  selectedName: { fontSize: font.body, fontWeight: "600", color: colors.text },
}));
