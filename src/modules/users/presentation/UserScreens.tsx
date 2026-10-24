import { useIsOnline } from "@/core/query/useIsOnline";
import { useRealtimeAccount } from "@/main/realtimeSession";
import { ACCOUNT_ROLES, roleLabels, type AccountRole } from "@/modules/auth/domain/Session";
import { describeError } from "@/shared/errors";
import { Chip, includesText, SearchField, Select, SwitchRow } from "@/shared/inputs";
import { confirm, Fab, FormScreen, IconButton, ListRow, ResourceList } from "@/shared/layout";
import { useTheme } from "@/shared/ThemeProvider";
import { Badge, Banner, Button, LoadingState, TextField } from "@/shared/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { CREATABLE_ROLES, validateAccount, type Account } from "../domain/Account";
import { useAccounts, useCreateAccount, useRemoveAccount, useUpdateAccount } from "./hooks";

export function UsersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const me = useRealtimeAccount();
  const accounts = useAccounts();
  const remove = useRemoveAccount();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AccountRole | null>(null);

  const items = useMemo(
    () =>
      (accounts.data ?? []).filter(
        (a) => (role === null || a.role === role) && includesText([a.name, a.email], search),
      ),
    [accounts.data, search, role],
  );

  const askRemove = async (account: Account) => {
    if (!(await confirm("Excluir usuário?", `${account.name} perderá o acesso ao sistema.`)))
      return;
    remove.mutate(account.id, {
      onError: (e) => Alert.alert("Não foi possível excluir", describeError(e)),
    });
  };

  return (
    <ResourceList
      query={accounts}
      items={items}
      keyExtractor={(a) => String(a.id)}
      header={
        <>
          <SearchField value={search} onChangeText={setSearch} placeholder="Nome ou e-mail" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Chip label="Todos" selected={role === null} onPress={() => setRole(null)} />
            {ACCOUNT_ROLES.map((r) => (
              <Chip
                key={r}
                label={roleLabels[r]}
                selected={role === r}
                onPress={() => setRole(r)}
              />
            ))}
          </ScrollView>
        </>
      }
      emptyTitle="Nenhum usuário encontrado"
      errorMessage={describeError}
      fab={
        <Fab
          label="Novo usuário"
          icon="person-add-outline"
          onPress={() => router.push("/users/new")}
        />
      }
      renderItem={({ item }) => (
        <ListRow
          icon="person-circle-outline"
          title={item.id === me?.id ? `${item.name} (você)` : item.name}
          subtitle={item.email}
          meta={roleLabels[item.role]}
          muted={!item.active}
          onPress={() => router.push(`/users/${item.id}`)}
          right={
            <>
              {!item.active ? (
                <Badge label="Inativo" color={colors.textMuted} background={colors.surfaceMuted} />
              ) : null}
              {item.id !== me?.id ? (
                <IconButton
                  icon="trash-outline"
                  label={`Excluir ${item.name}`}
                  tone="danger"
                  onPress={() => void askRemove(item)}
                />
              ) : null}
            </>
          }
        />
      )}
    />
  );
}

export function UserFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const accounts = useAccounts();
  const existing = isNew ? undefined : accounts.data?.find((a) => a.id === Number(id));

  if (!isNew && accounts.isLoading) return <LoadingState />;
  if (!isNew && !existing) return <Banner tone="error" message="Usuário não encontrado." />;

  return <UserForm key={existing?.id ?? "new"} account={existing} onDone={() => router.back()} />;
}

function UserForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const online = useIsOnline();
  const me = useRealtimeAccount();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const mutation = account ? update : create;
  const isSelf = account !== undefined && account.id === me?.id;

  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState<AccountRole>(account?.role ?? "user");
  const [active, setActive] = useState(account?.active ?? true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Contas existentes podem ter "gerente de estoque"; contas novas seguem o que o backend aceita.
  const roleOptions = (account ? ACCOUNT_ROLES : CREATABLE_ROLES).map((r) => ({
    value: r,
    label: roleLabels[r],
  }));

  const submit = () => {
    const found = validateAccount({ name, email, password, confirmation }, !account);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!account) {
      create.mutate({ name, email, role, password }, { onSuccess: onDone });
      return;
    }
    const changes = {
      ...(name.trim() !== account.name && { name: name.trim() }),
      ...(email.trim() !== account.email && { email: email.trim() }),
      ...(role !== account.role && { role }),
      ...(active !== account.active && { active }),
      ...(password && { password }),
    };
    if (Object.keys(changes).length === 0) return onDone();
    update.mutate({ id: account.id, changes }, { onSuccess: onDone });
  };

  return (
    <FormScreen
      footer={
        <Button
          title={account ? "Salvar alterações" : "Criar usuário"}
          icon="checkmark"
          onPress={submit}
          loading={mutation.isPending}
          disabled={!online}
          style={{ flex: 1 }}
        />
      }
    >
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para salvar." /> : null}
      {mutation.isError ? <Banner tone="error" message={describeError(mutation.error)} /> : null}
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
      />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Select label="Perfil" value={role} options={roleOptions} onChange={(v) => v && setRole(v)} />
      {account && !isSelf ? (
        <SwitchRow
          label="Conta ativa"
          description="Contas inativas não conseguem entrar."
          value={active}
          onChange={setActive}
        />
      ) : null}
      <TextField
        label={account ? "Nova senha (opcional)" : "Senha"}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Mínimo de 8 caracteres"
      />
      <TextField
        label="Confirmar senha"
        value={confirmation}
        onChangeText={setConfirmation}
        error={errors.confirmation}
        secureTextEntry
        autoCapitalize="none"
      />
    </FormScreen>
  );
}
