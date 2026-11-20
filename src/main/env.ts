import Constants from "expo-constants";

const API_PORT = 3000;

const trimSlash = (url: string) => url.replace(/\/+$/, "");

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
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || devHostApiUrl() || `http://localhost:${API_PORT}/api`;
  const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || originOf(apiUrl);
  const company = {
    name: process.env.EXPO_PUBLIC_DELIVERY_COMPANY_NAME || "FastOne Delivery",
    document: process.env.EXPO_PUBLIC_DELIVERY_COMPANY_DOCUMENT || "",
  };
  return { apiUrl: trimSlash(apiUrl), socketUrl: trimSlash(socketUrl), company };
};

export const env = resolveEnv();
