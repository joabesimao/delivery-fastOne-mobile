import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { container } from "@/main/container";
import { describeError } from "@/shared/errors";
import { font, radius, spacing } from "@/shared/theme";
import { Banner, Button, TextField } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextInputInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSessionState } from "./useSession";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { signOutReason } = useSessionState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const emailError =
    touched && !EMAIL_PATTERN.test(email.trim()) ? "Informe um e-mail válido." : undefined;
  const passwordError = touched && !password ? "Informe a senha." : undefined;

  const submit = async () => {
    setTouched(true);
    if (!EMAIL_PATTERN.test(email.trim()) || !password) return;

    setSubmitting(true);
    setError(null);
    try {
      await container.sessionManager.login({ email, password });
    } catch (err) {
      setError(
        describeError(err, {
          unauthorized: "E-mail ou senha incorretos.",
          rate_limited: "Muitas tentativas de login. Aguarde alguns minutos.",
          network: `Não foi possível falar com o servidor (${container.env.apiUrl}). Verifique a rede.`,
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="bicycle" size={36} color={colors.onPrimary} />
            </View>
            <Text style={styles.title}>FastOne</Text>
            <Text style={styles.subtitle}>Entre com a conta usada no painel.</Text>
          </View>

          <View style={styles.form}>
            {signOutReason === "expired" && !error ? (
              <Banner tone="info" message="Sua sessão expirou. Entre novamente." />
            ) : null}
            {error ? <Banner tone="error" message={error} /> : null}

            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              placeholder="voce@empresa.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!submitting}
            />

            <View>
              <TextField
                ref={passwordRef}
                label="Senha"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                placeholder="Sua senha"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!submitting}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                style={styles.eye}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            <Button title="Entrar" onPress={submit} loading={submitting} icon="log-in-outline" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
  brand: { alignItems: "center", gap: spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  form: { gap: spacing.lg },
  eye: { position: "absolute", right: spacing.md, top: 38 },
}));
