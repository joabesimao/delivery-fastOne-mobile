import { AppProviders } from "@/main/AppProviders";
import { isCourier } from "@/modules/auth/domain/Session";
import { useSessionState } from "@/modules/auth/presentation/useSession";
import { colors } from "@/shared/theme";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Segura o splash até a sessão salva ser lida, para não piscar a tela de login.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppProviders>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, session } = useSessionState();
  const signedIn = status === "signedIn";
  const courier = session ? isCourier(session.role) : false;

  useEffect(() => {
    if (status !== "restoring") SplashScreen.hide();
  }, [status]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
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

        <Stack.Protected guard={courier}>
          <Stack.Screen name="fuel-refill" options={{ title: "Registrar abastecimento" }} />
          <Stack.Screen name="oil-change" options={{ title: "Registrar troca de óleo" }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}
