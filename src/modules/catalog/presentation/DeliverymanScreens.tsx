import { useIsOnline } from "@/core/query/useIsOnline";
import { isAdmin } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { describeError } from "@/shared/errors";
import { cpfDigits, cpfMask, isValidCpf, phoneDigits, phoneMask } from "@/shared/format";
import { includesText, SearchField } from "@/shared/inputs";
import { confirm, Fab, FormScreen, IconButton, ListRow, ResourceList } from "@/shared/layout";
import { Banner, Button, LoadingState, TextField } from "@/shared/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import {
  deliverymanName,
  hasErrors,
  validateDeliveryman,
  type Deliveryman,
  type DeliverymanInput,
} from "../domain/Catalog";
import { useCatalogDeliverymen, useRemoveDeliveryman, useSaveDeliveryman } from "./hooks";

export function DeliverymenScreen() {
  const router = useRouter();
  const { role } = useSession();
  const admin = isAdmin(role);
  const deliverymen = useCatalogDeliverymen();
  const remove = useRemoveDeliveryman();
  const [search, setSearch] = useState("");

  const items = useMemo(
    () =>
      (deliverymen.data ?? []).filter((d) =>
        includesText([deliverymanName(d), d.phone, d.cpf, d.qualification], search),
      ),
    [deliverymen.data, search],
  );

  const askRemove = async (d: Deliveryman) => {
    if (!(await confirm("Excluir entregador?", `${deliverymanName(d)} será removido.`))) return;
    remove.mutate(d.id, {
      onError: (e) =>
        Alert.alert(
          "Não foi possível excluir",
          `${describeError(e)} Entregadores com entregas ou veículos não podem ser excluídos.`,
        ),
    });
  };

  return (
    <ResourceList
      query={deliverymen}
      items={items}
      keyExtractor={(d) => String(d.id)}
      header={
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Nome, telefone, CPF ou CNH"
        />
      }
      emptyTitle={search ? "Nenhum entregador encontrado" : "Nenhum entregador cadastrado"}
      errorMessage={describeError}
      fab={
        admin ? (
          <Fab
            label="Novo entregador"
            icon="person-add-outline"
            onPress={() => router.push("/deliverymen/new")}
          />
        ) : null
      }
      renderItem={({ item }) => (
        <ListRow
          icon="bicycle-outline"
          title={deliverymanName(item)}
          subtitle={phoneMask(item.phone)}
          meta={`CNH ${item.qualification}${item.cpf ? ` · CPF ${cpfMask(item.cpf)}` : ""}`}
          onPress={admin ? () => router.push(`/deliverymen/${item.id}`) : undefined}
          right={
            <>
              <IconButton
                icon="call-outline"
                label={`Ligar para ${item.name}`}
                tone="primary"
                onPress={() => void Linking.openURL(`tel:${phoneDigits(item.phone)}`)}
              />
              {admin ? (
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

export function DeliverymanFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const deliverymen = useCatalogDeliverymen();
  const existing = isNew ? undefined : deliverymen.data?.find((d) => d.id === Number(id));

  if (deliverymen.isLoading) return <LoadingState />;
  if (!isNew && !existing) return <Banner tone="error" message="Entregador não encontrado." />;

  return (
    <DeliverymanForm
      key={existing?.id ?? "new"}
      deliveryman={existing}
      others={(deliverymen.data ?? []).filter((d) => d.id !== existing?.id)}
      onDone={() => router.back()}
    />
  );
}

function DeliverymanForm({
  deliveryman,
  others,
  onDone,
}: {
  deliveryman?: Deliveryman;
  others: Deliveryman[];
  onDone: () => void;
}) {
  const online = useIsOnline();
  const save = useSaveDeliveryman();
  const [name, setName] = useState(deliveryman?.name ?? "");
  const [lastName, setLastName] = useState(deliveryman?.lastName ?? "");
  const [phone, setPhone] = useState(phoneMask(deliveryman?.phone ?? ""));
  const [cpf, setCpf] = useState(cpfMask(deliveryman?.cpf ?? ""));
  const [qualification, setQualification] = useState(deliveryman?.qualification ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof DeliverymanInput, string>>>({});

  const submit = () => {
    const input: DeliverymanInput = {
      name,
      lastName,
      phone: phoneDigits(phone),
      cpf: cpfDigits(cpf),
      qualification,
    };
    const found = validateDeliveryman(input, isValidCpf);
    // Mesmas checagens de duplicidade que o web faz antes de enviar.
    if (!found.cpf && others.some((d) => d.cpf === input.cpf)) found.cpf = "CPF já cadastrado.";
    if (
      !found.qualification &&
      others.some((d) => d.qualification === input.qualification.trim())
    ) {
      found.qualification = "CNH já cadastrada.";
    }
    if (!found.phone && others.some((d) => phoneDigits(d.phone) === input.phone)) {
      found.phone = "Telefone já cadastrado.";
    }
    setErrors(found);
    if (hasErrors(found)) return;
    save.mutate({ id: deliveryman?.id ?? null, input }, { onSuccess: onDone });
  };

  return (
    <FormScreen
      footer={
        <Button
          title={deliveryman ? "Salvar alterações" : "Cadastrar entregador"}
          icon="checkmark"
          onPress={submit}
          loading={save.isPending}
          disabled={!online}
          style={{ flex: 1 }}
        />
      }
    >
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para salvar." /> : null}
      {save.isError ? <Banner tone="error" message={describeError(save.error)} /> : null}
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
      />
      <TextField
        label="Sobrenome"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
        autoCapitalize="words"
      />
      <TextField
        label="Telefone"
        value={phone}
        onChangeText={(v) => setPhone(phoneMask(v))}
        keyboardType="phone-pad"
        error={errors.phone}
      />
      <TextField
        label="CPF"
        value={cpf}
        onChangeText={(v) => setCpf(cpfMask(v))}
        keyboardType="number-pad"
        error={errors.cpf}
      />
      <TextField
        label="Número da CNH"
        value={qualification}
        onChangeText={(v) => setQualification(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        error={errors.qualification}
      />
    </FormScreen>
  );
}
