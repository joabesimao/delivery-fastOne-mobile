// Azul da marca (#4361EE, o mesmo do painel web) com neutros puxados para o azul.
const light = {
  primary: "#4361EE",
  // Fundo de botão/FAB com texto branco; no escuro é mais fechado que o azul de texto.
  primaryFill: "#4361EE",
  primaryPressed: "#3451D1",
  primarySoft: "#E8ECFF",
  primaryBorder: "#C9D3FA",
  onPrimarySoft: "#2A3DB8",
  background: "#F3F5F9",
  surface: "#FFFFFF",
  surfacePressed: "#EEF1FA",
  surfaceMuted: "#F7F8FB",
  border: "#E3E7EF",
  borderStrong: "#C5CCDA",
  text: "#141A2E",
  textMuted: "#5B6478",
  textSubtle: "#8A92A6",
  danger: "#D0342C",
  dangerSoft: "#FDF1F0",
  dangerBorder: "#F6CBC7",
  success: "#0F8A5F",
  successSoft: "#E8F6EF",
  warning: "#C27803",
  warningSoft: "#FDF4E3",
  onPrimary: "#FFFFFF",
  disabled: "rgba(20,26,46,0.12)",
  onDisabled: "rgba(20,26,46,0.38)",
  overlay: "rgba(13,18,32,0.4)",
  // Ordem fixa, validada para daltonismo (dataviz validate_palette).
  chart: ["#4361EE", "#06B6D4", "#F59E0B"],
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  primary: "#6E86F7",
  primaryFill: "#4F68EC",
  primaryPressed: "#5A74F0",
  primarySoft: "rgba(67,97,238,0.18)",
  primaryBorder: "rgba(110,134,247,0.4)",
  onPrimarySoft: "#C9D3FA",
  background: "#0D1220",
  surface: "#151B2C",
  surfacePressed: "#1D2538",
  surfaceMuted: "#1A2133",
  border: "#232B40",
  borderStrong: "#36405A",
  text: "#EEF1F7",
  textMuted: "#9AA3B8",
  textSubtle: "#6E7790",
  danger: "#F2786F",
  dangerSoft: "rgba(208,52,44,0.16)",
  dangerBorder: "rgba(242,120,111,0.35)",
  success: "#3CC48F",
  successSoft: "rgba(15,138,95,0.16)",
  warning: "#F0B23E",
  warningSoft: "rgba(194,120,3,0.16)",
  onPrimary: "#FFFFFF",
  disabled: "rgba(238,241,247,0.12)",
  onDisabled: "rgba(238,241,247,0.38)",
  overlay: "rgba(0,0,0,0.6)",
  chart: ["#6E86F7", "#0D9488", "#D97706"],
};

export const palettes = { light, dark } as const;

export type ColorScheme = keyof typeof palettes;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  caption: 12,
  small: 13,
  body: 15,
  title: 18,
  heading: 24,
} as const;

// IBM Plex Sans: com fonte customizada cada peso é uma família separada, então
// o makeStyles troca o fontWeight dos estilos pela família correspondente.
export const fontFamily = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  semibold: "IBMPlexSans_600SemiBold",
} as const;

export type FontWeight = "400" | "500" | "600";

export const familyForWeight = (weight: FontWeight | undefined) =>
  weight === "600"
    ? fontFamily.semibold
    : weight === "500"
      ? fontFamily.medium
      : fontFamily.regular;
