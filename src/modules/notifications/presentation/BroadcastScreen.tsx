import { useIsOnline } from "@/core/query/useIsOnline";
import { ACCOUNT_ROLES, roleLabels, type AccountRole } from "@/modules/auth/domain/Session";
import { describeError } from "@/shared/errors";
import { Chip } from "@/shared/inputs";
import { FormScreen } from "@/shared/layout";
import { makeStyles } from "@/shared/ThemeProvider";
import { font, spacing } from "@/shared/theme";
import { Banner, Button, TextField } from "@/shared/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { BROADCAST_BODY_MAX, BROADCAST_TITLE_MAX } from "../domain/Notification";
import { useBroadcastNotice } from "./hooks";

// "Enviar aviso" do sino do painel web (só admin).
export function BroadcastScreen() {
  const styles = useStyles();
  const router = useRouter();
  const online = useIsOnline();
  const broadcast = useBroadcastNotice();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<AccountRole[]>([]);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const toggleRole = (role: AccountRole) =>
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    );

  const submit = () => {
    const found: typeof errors = {};
    if (!title.trim()) found.title = "Informe o título.";
    if (!body.trim()) found.body = "Escreva a mensagem.";
    setErrors(found);
    if (found.title || found.body) return;
    broadcast.mutate(
      { title, body, roles },
      {
        onSuccess: (recipients) => {
          Alert.alert(
            "Aviso enviado",
            `${recipients} ${recipients === 1 ? "pessoa recebeu" : "pessoas receberam"} o aviso.`,
          );
          router.back();
        },
      },
    );
  };

  return (
    <FormScreen
      footer={
        <Button
          title="Enviar aviso"
          icon="send"
          onPress={submit}
          loading={broadcast.isPending}
          disabled={!online}
          style={styles.flex}
        />
      }
    >
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para enviar." /> : null}
      {broadcast.isError ? <Banner tone="error" message={describeError(broadcast.error)} /> : null}
      <TextField
        label="Título"
        value={title}
        onChangeText={setTitle}
        maxLength={BROADCAST_TITLE_MAX}
        error={errors.title}
      />
      <TextField
        label="Mensagem"
        value={body}
        onChangeText={setBody}
        maxLength={BROADCAST_BODY_MAX}
        error={errors.body}
        multiline
        style={styles.body}
      />
      <Text style={styles.counter}>
        {body.length}/{BROADCAST_BODY_MAX}
      </Text>
      <View style={styles.roles}>
        <Text style={styles.label}>Para quem</Text>
        <View style={styles.chips}>
          <Chip label="Todos" selected={roles.length === 0} onPress={() => setRoles([])} />
          {ACCOUNT_ROLES.map((role) => (
            <Chip
              key={role}
              label={roleLabels[role]}
              selected={roles.includes(role)}
              onPress={() => toggleRole(role)}
            />
          ))}
        </View>
      </View>
    </FormScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  body: { minHeight: 120, textAlignVertical: "top" },
  counter: {
    fontSize: font.caption,
    color: colors.textSubtle,
    alignSelf: "flex-end",
    marginTop: -spacing.md,
  },
  roles: { gap: spacing.sm },
  label: { fontSize: font.small, fontWeight: "500", color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}));
