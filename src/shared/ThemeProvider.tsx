import { secureStorage } from "@/core/storage/secureStorage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { palettes, type ColorScheme, type ThemeColors } from "./theme";

export type ThemePreference = ColorScheme | "system";

const PREFERENCE_KEY = "fastone.theme";

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "light",
  colors: palettes.light,
  preference: "system",
  setPreference: () => undefined,
});

const isPreference = (value: string | null): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void secureStorage.get(PREFERENCE_KEY).then((stored) => {
      if (isPreference(stored)) setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void secureStorage.set(PREFERENCE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ColorScheme =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme], preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Estilos que dependem das cores do tema; recriados só quando o tema muda.
type Styles = Parameters<typeof StyleSheet.create>[0];

export const makeStyles =
  <S extends Styles>(factory: (colors: ThemeColors) => S & Styles) =>
  (): Readonly<S> => {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
