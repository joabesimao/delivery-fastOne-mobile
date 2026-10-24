export const colors = {
  primary: "#4361EE",
  primaryPressed: "#3451D1",
  primarySoft: "#E8ECFF",
  background: "#F5F6FA",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#059669",
  successSoft: "#ECFDF5",
  warning: "#D97706",
  warningSoft: "#FFF7E6",
  white: "#FFFFFF",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  caption: 12,
  small: 13,
  body: 15,
  title: 18,
  heading: 24,
} as const;
