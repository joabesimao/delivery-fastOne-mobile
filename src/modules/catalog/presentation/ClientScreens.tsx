import { useIsOnline } from "@/core/query/useIsOnline";
import { isAdmin } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { describeError } from "@/shared/errors";
import { cpfDigits, cpfMask, isValidCpf, phoneDigits, phoneMask } from "@/shared/format";
import { Chip, includesText, SearchField, Select } from "@/shared/inputs";
import { confirm, Fab, FieldRow, FormScreen, ListRow, ResourceList } from "@/shared/layout";
import { Badge, Banner, Button, LoadingState, SectionTitle, TextField } from "@/shared/ui";
import { useTheme } from "@/shared/ThemeProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import {
  formatClientAddress,
  hasErrors,
  validateAddress,
  validateClient,
  type Client,
} from "../domain/Catalog";
import {
  useAddClient,
  useCities,
  useClients,
  useNeighborhoods,
  useRemoveClient,
  useToggleClient,
  useUpdateClient,
} from "./hooks";

type StatusFilter = "all" | "active" | "inactive";

export function ClientsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { role } = useSession();
  const clients = useClients();
  const toggle = useToggleClient();
  const remove = useRemoveClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const items = useMemo(
    () =>
      (clients.data ?? [])
        .filter((c) => status === "all" || c.active === (status === "active"))
        .filter((c) =>
          includesText(
            [
              c.name,
              c.cpf,
              cpfMask(c.cpf),
              c.phone,
              c.address?.street,
              c.address?.neighborhood,
              c.address?.city,
            ],
            search,
          ),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [clients.data, search, status],
  );

  const actions = (client: Client) => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: "Editar", onPress: () => router.push(`/clients/${client.id}`) },
    ];
    if (client.registerId !== null && client.active) {
      buttons.push({
        text: "Nova entrega",
        onPress: () =>
          router.push({ pathname: "/new-delivery", params: { registerId: client.registerId } }),
      });
    }
    buttons.push({
      text: client.active ? "Desativar" : "Ativar",
      onPress: () =>
        toggle.mutate(
          { id: client.id, active: !client.active },
          { onError: (e) => Alert.alert("Erro", describeError(e)) },
        ),
    });
    if (isAdmin(role) && client.registerId !== null) {
      const registerId = client.registerId;
      buttons.push({
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          if (!(await confirm("Excluir cliente?", `${client.name} e o endereço serão removidos.`)))
            return;
          remove.mutate(registerId, {
            onError: (e) =>
              Alert.alert(
                "Não foi possível excluir",
                `${describeError(e)} Clientes com entregas não podem ser excluídos; desative-o.`,
              ),
          });
        },
      });
    }
    buttons.push({ text: "Cancelar", style: "cancel" });
    Alert.alert(client.name, formatClientAddress(client.address), buttons);
  };

  return (
    <ResourceList
      query={clients}
      items={items}
      keyExtractor={(c) => String(c.id)}
      header={
        <>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Nome, CPF, telefone ou endereço"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(
              [
                ["all", "Todos"],
                ["active", "Ativos"],
                ["inactive", "Inativos"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={status === value}
                onPress={() => setStatus(value)}
              />
            ))}
          </ScrollView>
        </>
      }
      emptyTitle={
        search || status !== "all" ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"
      }
      errorMessage={describeError}
      fab={
        <Fab
          label="Novo cliente"
          icon="person-add-outline"
          onPress={() => router.push("/clients/new")}
        />
      }
      renderItem={({ item }) => (
        <ListRow
          title={item.name}
          subtitle={formatClientAddress(item.address)}
          meta={`${phoneMask(item.phone)} · CPF ${cpfMask(item.cpf)}`}
          muted={!item.active}
          onPress={() => actions(item)}
          right={!item.active ? <Badge label="Inativo" color={colors.textMuted} /> : undefined}
        />
      )}
    />
  );
}

export function ClientFormScreen() {
  const router = useRouter();
  const online = useIsOnline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const clients = useClients();
  const existing = isNew ? undefined : clients.data?.find((c) => c.id === Number(id));

  if (!isNew && clients.isLoading) return <LoadingState />;
  if (!isNew && !existing) return <Banner tone="error" message="Cliente não encontrado." />;

  return (
    <ClientForm
      key={existing?.id ?? "new"}
      client={existing}
      online={online}
      onDone={() => router.back()}
    />
  );
}

function ClientForm({
  client,
  online,
  onDone,
}: {
  client?: Client;
  online: boolean;
  onDone: () => void;
}) {
  const clients = useClients();
  const cities = useCities();
  const neighborhoods = useNeighborhoods();
  const add = useAddClient();
  const update = useUpdateClient();
  const mutation = client ? update : add;

  const [name, setName] = useState(client?.name ?? "");
  const [cpf, setCpf] = useState(cpfMask(client?.cpf ?? ""));
  const [phone, setPhone] = useState(phoneMask(client?.phone ?? ""));
  const [street, setStreet] = useState(client?.address?.street ?? "");
  const [number, setNumber] = useState(client?.address ? String(client.address.number) : "");
  const [city, setCity] = useState(client?.address?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(client?.address?.neighborhood ?? "");
  const [reference, setReference] = useState(client?.address?.reference ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const cityOptions = useMemo(
    () => (cities.data ?? []).map((c) => ({ value: c.name, label: c.name })),
    [cities.data],
  );
  const neighborhoodOptions = useMemo(
    () =>
      (neighborhoods.data ?? [])
        .filter((n) => !city || n.cityName === city)
        .map((n) => ({ value: n.name, label: n.name, description: n.cityName })),
    [neighborhoods.data, city],
  );

  const submit = () => {
    const clientInput = { name, cpf: cpfDigits(cpf), phone: phoneDigits(phone) };
    const addressInput = { street, number, neighborhood, city, reference };
    const found: Record<string, string | undefined> = {
      ...validateClient(clientInput, isValidCpf),
      ...validateAddress(addressInput),
    };
    // O backend também recusa CPF repetido; avisar antes poupa a ida à rede.
    if (!found.cpf && clients.data?.some((c) => c.cpf === clientInput.cpf && c.id !== client?.id)) {
      found.cpf = "Já existe um cliente com esse CPF.";
    }
    setErrors(found);
    if (hasErrors(found)) return;

    const address = { ...addressInput, number: Number(number), reference: reference.trim() };
    if (client) {
      update.mutate(
        { id: client.id, addressId: client.address?.id ?? null, client: clientInput, address },
        { onSuccess: onDone },
      );
    } else {
      add.mutate({ client: clientInput, address }, { onSuccess: onDone });
    }
  };

  return (
    <FormScreen
      footer={
        <Button
          title={client ? "Salvar alterações" : "Cadastrar cliente"}
          onPress={submit}
          loading={mutation.isPending}
          disabled={!online}
          style={{ flex: 1 }}
        />
      }
    >
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para salvar." /> : null}
      {mutation.isError ? <Banner tone="error" message={describeError(mutation.error)} /> : null}

      <SectionTitle>Dados do cliente</SectionTitle>
      <TextField
        label="Nome completo"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
      />
      <FieldRow>
        <TextField
          label="CPF"
          value={cpf}
          onChangeText={(v) => setCpf(cpfMask(v))}
          keyboardType="number-pad"
          error={errors.cpf}
          placeholder="000.000.000-00"
        />
        <TextField
          label="Telefone"
          value={phone}
          onChangeText={(v) => setPhone(phoneMask(v))}
          keyboardType="phone-pad"
          error={errors.phone}
          placeholder="(00) 00000-0000"
        />
      </FieldRow>

      <SectionTitle>Endereço</SectionTitle>
      <FieldRow weights={[3, 1]}>
        <TextField label="Rua" value={street} onChangeText={setStreet} error={errors.street} />
        <TextField
          label="Nº"
          value={number}
          onChangeText={(v) => setNumber(v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          error={errors.number}
          accessibilityLabel="Número"
        />
      </FieldRow>
      <Select
        label="Cidade"
        value={city || null}
        options={cityOptions}
        onChange={(v) => {
          setCity(v ?? "");
          if (v !== city) setNeighborhood("");
        }}
        error={errors.city}
        loading={cities.isLoading}
        placeholder={cityOptions.length ? "Selecione" : "Cadastre cidades em Cadastros"}
      />
      <Select
        label="Bairro"
        value={neighborhood || null}
        options={neighborhoodOptions}
        onChange={(v) => setNeighborhood(v ?? "")}
        error={errors.neighborhood}
        loading={neighborhoods.isLoading}
        placeholder={city ? "Selecione" : "Escolha a cidade primeiro"}
      />
      <TextField label="Referência (opcional)" value={reference} onChangeText={setReference} />
    </FormScreen>
  );
}
