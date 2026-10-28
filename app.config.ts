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
  // "automatic" deixa o app seguir o tema do sistema (o usuário pode fixar em Aparência).
  userInterfaceStyle: "automatic",
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
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission: "O FastOne usa suas fotos para cadastrar produtos.",
        cameraPermission: "O FastOne usa a câmera para fotografar produtos.",
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
  },
});
