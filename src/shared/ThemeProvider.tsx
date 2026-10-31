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
import { StyleSheet, useColorScheme, type TextStyle } from "react-native";
import { PaperProvider } from "react-native-paper";
import { buildPaperTheme } from "./paperTheme";
import {
  familyForWeight,
  palettes,
  type ColorScheme,
  type FontWeight,
  type ThemeColors,
} from "./theme";

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

  const paperTheme = useMemo(() => buildPaperTheme(scheme, palettes[scheme]), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Estilos que dependem das cores do tema; recriados só quando o tema muda.
type Styles = Parameters<typeof StyleSheet.create>[0];

// Estilo de texto (tem fontSize ou fontWeight) recebe a família IBM Plex do peso.
// O fontWeight sai: no Android ele faz a fonte customizada cair na do sistema.
const withFontFamily = <S extends Styles>(styles: S): S => {
  const result: Record<string, unknown> = {};
  for (const [name, style] of Object.entries(styles)) {
    const { fontSize, fontWeight, fontFamily, ...rest } = style as TextStyle;
    result[name] =
      fontFamily || (fontSize === undefined && fontWeight === undefined)
        ? style
        : { ...rest, fontSize, fontFamily: familyForWeight(fontWeight as FontWeight | undefined) };
  }
  return result as S;
};

export const makeStyles =
  <S extends Styles>(factory: (colors: ThemeColors) => S & Styles) =>
  (): Readonly<S> => {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(withFontFamily(factory(colors))), [colors]);
  };
