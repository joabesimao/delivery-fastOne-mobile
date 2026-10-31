import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
  type MD3Theme,
  type MD3TypescaleKey,
} from "react-native-paper";
import { fontFamily, type ColorScheme, type ThemeColors } from "./theme";

// Família por variante do Material 3: títulos em semibold, rótulos em medium.
const variantFamily: Record<MD3TypescaleKey, string> = {
  displayLarge: fontFamily.semibold,
  displayMedium: fontFamily.semibold,
  displaySmall: fontFamily.semibold,
  headlineLarge: fontFamily.semibold,
  headlineMedium: fontFamily.semibold,
  headlineSmall: fontFamily.semibold,
  titleLarge: fontFamily.semibold,
  titleMedium: fontFamily.medium,
  titleSmall: fontFamily.medium,
  labelLarge: fontFamily.medium,
  labelMedium: fontFamily.medium,
  labelSmall: fontFamily.medium,
  bodyLarge: fontFamily.regular,
  bodyMedium: fontFamily.regular,
  bodySmall: fontFamily.regular,
};

// O peso já vem da família; fontWeight "400" evita negrito sintético no Android.
const fonts = configureFonts({
  config: Object.fromEntries(
    Object.entries(variantFamily).map(([variant, family]) => [
      variant,
      { fontFamily: family, fontWeight: "400", letterSpacing: 0 },
    ]),
  ),
});

// Tema do Paper montado só com os tokens do app: nada do roxo padrão do Material 3.
export const buildPaperTheme = (scheme: ColorScheme, colors: ThemeColors): MD3Theme => {
  const base = scheme === "dark" ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 2,
    fonts,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primarySoft,
      onPrimaryContainer: colors.onPrimarySoft,
      secondary: colors.textMuted,
      onSecondary: colors.onPrimary,
      secondaryContainer: colors.primarySoft,
      onSecondaryContainer: colors.onPrimarySoft,
      tertiary: colors.primary,
      onTertiary: colors.onPrimary,
      tertiaryContainer: colors.primarySoft,
      onTertiaryContainer: colors.onPrimarySoft,
      background: colors.background,
      onBackground: colors.text,
      surface: colors.surface,
      onSurface: colors.text,
      surfaceVariant: colors.surfaceMuted,
      onSurfaceVariant: colors.textMuted,
      surfaceDisabled: colors.disabled,
      onSurfaceDisabled: colors.onDisabled,
      outline: colors.borderStrong,
      outlineVariant: colors.border,
      error: colors.danger,
      onError: colors.onPrimary,
      errorContainer: colors.dangerSoft,
      onErrorContainer: colors.danger,
      inverseSurface: colors.text,
      inverseOnSurface: colors.surface,
      inversePrimary: colors.primaryBorder,
      backdrop: colors.overlay,
      elevation: {
        level0: "transparent",
        level1: colors.surface,
        level2: colors.surface,
        level3: colors.surfaceMuted,
        level4: colors.surfaceMuted,
        level5: colors.surfaceMuted,
      },
    },
  };
};
