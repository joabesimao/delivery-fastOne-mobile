import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { container } from "@/main/container";
import { font, radius, spacing } from "@/shared/theme";
import { Button, DetailRow, SectionTitle } from "@/shared/ui";
import Constants from "expo-constants";
import { ListGroup, ListRow } from "@/shared/layout";
import { useState, type ReactNode } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Switch } from "react-native-paper";
import { roleLabels } from "../domain/Session";
import { useSession } from "./useSession";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// Perfil do entregador (aba) e cabeçalho do menu "Mais" do gestor, que injeta as seções em `menu`.
export function ProfileScreen({ menu }: { menu?: ReactNode }) {
  const styles = useStyles();
  const { colors, scheme, setPreference } = useTheme();
  const { name, role } = useSession();
  const [leaving, setLeaving] = useState(false);

  const logout = () =>
    Alert.alert("Sair da conta?", "Você precisará entrar de novo para usar o app.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          setLeaving(true);
          void container.sessionManager.logout();
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name) || "?"}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.role}>{roleLabels[role]}</Text>
        </View>
      </View>

      {menu}

      <View style={styles.section}>
        <SectionTitle>Preferências</SectionTitle>
        <ListGroup>
          <ListRow
            icon="moon-outline"
            title="Modo escuro"
            right={
              <Switch
                value={scheme === "dark"}
                onValueChange={(on) => setPreference(on ? "dark" : "light")}
                color={colors.primary}
                accessibilityLabel="Modo escuro"
              />
            }
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <SectionTitle>Sobre o app</SectionTitle>
        <ListGroup>
          <DetailRow label="Versão" value={Constants.expoConfig?.version ?? "—"} />
        </ListGroup>
      </View>

      <Button title="Sair da conta" variant="danger" onPress={logout} loading={leaving} />
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: font.title + 2, fontWeight: "600", color: colors.onPrimarySoft },
  name: { fontSize: font.title + 2, fontWeight: "600", color: colors.text },
  role: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
}));
