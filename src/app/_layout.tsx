import { AppProviders } from "@/main/AppProviders";
import { canOperate, isAdmin, isFleetManager } from "@/modules/auth/domain/Session";
import { useSessionState } from "@/modules/auth/presentation/useSession";
import { ThemeProvider, useTheme } from "@/shared/ThemeProvider";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Segura o splash até a sessão salva ser lida, para não piscar a tela de login.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProviders>
          <ThemedNavigation />
        </AppProviders>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigation() {
  const { scheme, colors } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </NavigationThemeProvider>
  );
}

function RootNavigator() {
  const { colors } = useTheme();
  const { status, session } = useSessionState();
  const signedIn = status === "signedIn";
  const role = session?.role ?? "entregador";
  const operator = signedIn && canOperate(role);

  useEffect(() => {
    if (status !== "restoring") SplashScreen.hide();
  }, [status]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/[id]" options={{ title: "Entrega" }} />
        <Stack.Screen name="fuel-refill" options={{ title: "Abastecimento" }} />
        <Stack.Screen name="oil-change" options={{ title: "Troca de óleo" }} />
        <Stack.Screen name="settings/appearance" options={{ title: "Aparência" }} />
      </Stack.Protected>

      {/* Telas de gestão: o backend também bloqueia, aqui só não aparecem. */}
      <Stack.Protected guard={operator}>
        <Stack.Screen name="search" options={{ title: "Buscar" }} />
        <Stack.Screen name="new-delivery" options={{ title: "Realizar entrega" }} />
        <Stack.Screen name="clients/index" options={{ title: "Clientes" }} />
        <Stack.Screen name="clients/[id]" options={{ title: "Cliente" }} />
        <Stack.Screen name="products/index" options={{ title: "Produtos" }} />
        <Stack.Screen name="products/[id]" options={{ title: "Produto" }} />
        <Stack.Screen name="deliverymen/index" options={{ title: "Entregadores" }} />
        <Stack.Screen name="deliverymen/[id]" options={{ title: "Entregador" }} />
        <Stack.Screen name="vehicles/index" options={{ title: "Veículos" }} />
        <Stack.Screen name="vehicles/[id]" options={{ title: "Veículo" }} />
        <Stack.Screen name="cities" options={{ title: "Cidades" }} />
        <Stack.Screen name="neighborhoods" options={{ title: "Bairros" }} />
        <Stack.Screen name="fuel-refills" options={{ title: "Abastecimentos" }} />
        <Stack.Screen name="oil-changes" options={{ title: "Trocas de óleo" }} />
        <Stack.Screen name="reports/overview" options={{ title: "Relatórios do painel" }} />
        <Stack.Screen name="reports/deliveries" options={{ title: "Relatórios das entregas" }} />
        <Stack.Screen name="reports/ranking" options={{ title: "Ranking de entregadores" }} />
        <Stack.Screen name="chat-search" options={{ title: "Buscar no chat" }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && isAdmin(role)}>
        <Stack.Screen name="users/index" options={{ title: "Usuários" }} />
        <Stack.Screen name="users/[id]" options={{ title: "Usuário" }} />
        <Stack.Screen name="broadcast" options={{ title: "Enviar aviso" }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && isFleetManager(role)}>
        <Stack.Screen name="settings/fleet" options={{ title: "Configurações de frota" }} />
      </Stack.Protected>
    </Stack>
  );
}
