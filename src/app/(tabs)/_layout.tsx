import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useUnreadCount } from "@/modules/notifications/presentation/hooks";
import { useTheme } from "@/shared/ThemeProvider";
import type { IconName } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter, type Href } from "expo-router";
import { Pressable, type ColorValue } from "react-native";

const icon = (name: IconName) => {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === "string" ? color : undefined} />
  );
  return TabIcon;
};

// Atalho no cabeçalho (busca global).
function HeaderAction({ name, label, href }: { name: IconName; label: string; href: Href }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => router.push(href)}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name={name} size={22} color={colors.primary} />
    </Pressable>
  );
}

const searchAction = () => <HeaderAction name="search" label="Buscar" href="/search" />;

export default function TabsLayout() {
  const { colors } = useTheme();
  const { role } = useSession();
  const courier = isCourier(role);
  const unread = useUnreadCount();
  const badge = unread.data ? (unread.data > 99 ? "99+" : unread.data) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Protected guard={!courier}>
        <Tabs.Screen
          name="dashboard"
          options={{ title: "Painel", tabBarIcon: icon("grid-outline"), headerRight: searchAction }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="deliveries"
        options={{
          title: courier ? "Minhas entregas" : "Entregas",
          tabBarLabel: "Entregas",
          tabBarIcon: icon("cube-outline"),
          headerRight: courier ? undefined : searchAction,
        }}
      />

      <Tabs.Protected guard={courier}>
        <Tabs.Screen name="fleet" options={{ title: "Frota", tabBarIcon: icon("car-outline") }} />
      </Tabs.Protected>

      <Tabs.Screen
        name="notifications"
        options={{ title: "Avisos", tabBarIcon: icon("notifications-outline"), tabBarBadge: badge }}
      />

      <Tabs.Protected guard={courier}>
        <Tabs.Screen
          name="profile"
          options={{ title: "Perfil", tabBarIcon: icon("person-outline") }}
        />
      </Tabs.Protected>

      {/* Gestor: perfil + todos os módulos do menu lateral do web. */}
      <Tabs.Protected guard={!courier}>
        <Tabs.Screen name="more" options={{ title: "Mais", tabBarIcon: icon("menu-outline") }} />
      </Tabs.Protected>
    </Tabs>
  );
}
