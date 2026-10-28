import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { container } from "@/main/container";
import { useRealtimeStatus } from "@/main/realtimeSession";
import { font, radius, spacing } from "@/shared/theme";
import { Button, Card, InfoRow } from "@/shared/ui";
import Constants from "expo-constants";
import { MenuItem } from "@/shared/layout";
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
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{roleLabels[role]}</Text>
      </View>

      {menu}

      <MenuItem
        icon="color-palette-outline"
        label="Aparência"
        description="Tema claro, escuro ou do sistema"
        onPress={() => router.push("/settings/appearance")}
      />

      <Card>
        <InfoRow
          icon="pulse-outline"
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
        <InfoRow icon="server-outline" label="Servidor" value={container.env.apiUrl} />
        <InfoRow
          icon="information-circle-outline"
          label="Versão"
          value={Constants.expoConfig?.version ?? "—"}
        />
      </Card>

      <Button
        title="Sair"
        variant="danger"
        icon="log-out-outline"
        onPress={logout}
        loading={leaving}
      />
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.onPrimary },
  name: { fontSize: font.heading - 2, fontWeight: "800", color: colors.text, textAlign: "center" },
  role: { fontSize: font.body, color: colors.textMuted },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: font.body, color: colors.text },
}));
