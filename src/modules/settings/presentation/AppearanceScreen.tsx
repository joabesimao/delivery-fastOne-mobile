import { useTheme, type ThemePreference } from "@/shared/ThemeProvider";
import { Screen } from "@/shared/layout";
import { Segmented, Card } from "@/shared/ui";
import { makeStyles } from "@/shared/ThemeProvider";
import { font } from "@/shared/theme";
import { Text } from "react-native";

const options: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

// "Configurações visuais" do web: tema claro/escuro, salvo no aparelho.
export function AppearanceScreen() {
  const styles = useStyles();
  const { preference, setPreference, scheme } = useTheme();
  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>Tema</Text>
        <Segmented value={preference} onChange={setPreference} options={options} />
        <Text style={styles.hint}>
          {preference === "system"
            ? `Seguindo o aparelho (agora: ${scheme === "dark" ? "escuro" : "claro"}).`
            : "A escolha fica salva neste aparelho."}
        </Text>
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { gap: 12 },
  title: { fontSize: font.title, fontWeight: "700", color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted },
}));
