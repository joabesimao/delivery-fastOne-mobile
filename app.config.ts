import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as AppVariant;

const identifiers: Record<AppVariant, { name: string; id: string }> = {
  development: { name: "FastOne (Dev)", id: "com.joabesimao.fastone.dev" },
  preview: { name: "FastOne (Preview)", id: "com.joabesimao.fastone.preview" },
  production: { name: "FastOne", id: "com.joabesimao.fastone" },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: identifiers[variant].name,
  slug: "delivery-fastone-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "fastone",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: false,
    bundleIdentifier: identifiers[variant].id,
  },
  android: {
    package: identifiers[variant].id,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  plugins: ["expo-router", "expo-secure-store"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
  },
});
