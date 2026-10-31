import { Logo } from "@/shared/Logo";
import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { container } from "@/main/container";
import { describeError } from "@/shared/errors";
import { font, spacing } from "@/shared/theme";
import { Banner, Button, TextField, type TextFieldHandle } from "@/shared/ui";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
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
  const passwordRef = useRef<TextFieldHandle>(null);

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
            <View style={styles.lockup}>
              <Logo size={44} background={colors.primaryFill} />
              <Text style={styles.wordmark} accessibilityRole="header">
                Fast<Text style={styles.wordmarkAccent}>One</Text>
              </Text>
            </View>
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
              action={{
                icon: showPassword ? "eye-off-outline" : "eye-outline",
                label: showPassword ? "Ocultar senha" : "Mostrar senha",
                onPress: () => setShowPassword((v) => !v),
              }}
            />

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
  brand: { gap: spacing.sm },
  lockup: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wordmark: { fontSize: 32, fontWeight: "600", color: colors.text, letterSpacing: -0.5 },
  wordmarkAccent: { color: colors.primary },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  form: { gap: spacing.lg },
}));
