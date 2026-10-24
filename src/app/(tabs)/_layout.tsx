import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useUnreadCount } from "@/modules/notifications/presentation/hooks";
import { colors } from "@/shared/theme";
import type { IconName } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

const icon = (name: IconName) => {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === "string" ? color : undefined} />
  );
  return TabIcon;
};

export default function TabsLayout() {
  const { role } = useSession();
  const courier = isCourier(role);
  const unread = useUnreadCount();
  const badge = unread.data ? (unread.data > 99 ? "99+" : unread.data) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Protected guard={!courier}>
        <Tabs.Screen
          name="dashboard"
          options={{ title: "Painel", tabBarIcon: icon("grid-outline") }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="deliveries"
        options={{
          title: courier ? "Minhas entregas" : "Entregas",
          tabBarLabel: "Entregas",
          tabBarIcon: icon("cube-outline"),
        }}
      />

      <Tabs.Protected guard={courier}>
        <Tabs.Screen name="fleet" options={{ title: "Frota", tabBarIcon: icon("car-outline") }} />
      </Tabs.Protected>

      <Tabs.Protected guard={!courier}>
        <Tabs.Screen
          name="chat"
          options={{ title: "Chat", tabBarIcon: icon("chatbubbles-outline") }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="notifications"
        options={{ title: "Avisos", tabBarIcon: icon("notifications-outline"), tabBarBadge: badge }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: icon("person-outline") }}
      />
    </Tabs>
  );
}
