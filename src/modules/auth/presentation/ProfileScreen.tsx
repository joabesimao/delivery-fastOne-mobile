import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { container } from "@/main/container";
import { useRealtimeStatus } from "@/main/realtimeSession";
import { font, radius, spacing } from "@/shared/theme";
import { Button, DetailRow, SectionTitle } from "@/shared/ui";
import Constants from "expo-constants";
import { ListGroup, MenuItem } from "@/shared/layout";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { roleLabels } from "../domain/Session";
import { useSession } from "./useSession";

const realtimeLabels = {
  connected: "Conectado",
  connecting: "Conectando...",
  disconnected: "Desconectado",
} as const;

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
  const router = useRouter();
  const { colors } = useTheme();
  const { name, role } = useSession();
  const realtimeStatus = useRealtimeStatus();
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
          <MenuItem
            icon="color-palette-outline"
            label="Aparência"
            description="Tema claro, escuro ou do sistema"
            onPress={() => router.push("/settings/appearance")}
          />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <SectionTitle>Sobre o app</SectionTitle>
        <ListGroup>
          <DetailRow
            label="Tempo real"
            value={
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        realtimeStatus === "connected" ? colors.success : colors.warning,
                    },
                  ]}
                />
                <Text style={styles.value}>{realtimeLabels[realtimeStatus]}</Text>
              </View>
            }
          />
          <DetailRow label="Servidor" value={container.env.apiUrl.replace(/^https?:\/\//, "")} />
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
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: font.body, fontWeight: "500", color: colors.text },
}));
