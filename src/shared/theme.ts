// Mesma identidade visual do painel web (primária #4361EE).
const light = {
  primary: "#4361EE",
  primaryPressed: "#3451D1",
  primarySoft: "#E8ECFF",
  primaryBorder: "#C7D2FE",
  background: "#F5F6FA",
  surface: "#FFFFFF",
  surfacePressed: "#F0F4FF",
  surfaceMuted: "#F9FAFB",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  success: "#059669",
  successSoft: "#ECFDF5",
  warning: "#D97706",
  warningSoft: "#FFF7E6",
  onPrimary: "#FFFFFF",
  overlay: "rgba(0,0,0,0.35)",
  // Ordem fixa, validada para daltonismo (dataviz validate_palette).
  chart: ["#4361EE", "#06B6D4", "#F59E0B"],
};

export type ThemeColors = typeof light;

// Cores escuras iguais às do modo escuro do painel web.
const dark: ThemeColors = {
  primary: "#6E86F7",
  primaryPressed: "#5A74F0",
  primarySoft: "rgba(67,97,238,0.18)",
  primaryBorder: "rgba(129,140,248,0.4)",
  background: "#0B1120",
  surface: "#111827",
  surfacePressed: "#1E2A3A",
  surfaceMuted: "#1F2937",
  border: "rgba(255,255,255,0.08)",
  text: "#F1F5F9",
  textMuted: "#9CA3AF",
  textSubtle: "#6B7280",
  danger: "#F87171",
  dangerSoft: "rgba(220,38,38,0.15)",
  dangerBorder: "rgba(248,113,113,0.35)",
  success: "#34D399",
  successSoft: "rgba(5,150,105,0.15)",
  warning: "#FBBF24",
  warningSoft: "rgba(217,119,6,0.15)",
  onPrimary: "#FFFFFF",
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
