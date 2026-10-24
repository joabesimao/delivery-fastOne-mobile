import Constants from "expo-constants";

const API_PORT = 3000;

const trimSlash = (url: string) => url.replace(/\/+$/, "");

// Em dev, sem .env, usa o IP da máquina que serve o Metro: no celular, `localhost` é o próprio aparelho.
const devHostApiUrl = (): string | null => {
  if (!__DEV__) return null;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:${API_PORT}/api` : null;
};

const originOf = (url: string): string => {
  const match = /^(https?:\/\/[^/]+)/.exec(url);
  return match?.[1] ?? url;
};

const resolveEnv = () => {
  // Referências literais: o Expo só embute EXPO_PUBLIC_* escritas assim.
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || devHostApiUrl() || `http://localhost:${API_PORT}/api`;
  const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || originOf(apiUrl);
  return { apiUrl: trimSlash(apiUrl), socketUrl: trimSlash(socketUrl) };
};

export const env = resolveEnv();
