import { useIsOnline } from "@/core/query/useIsOnline";
import { isFleetManager } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useDeliverymen } from "@/modules/deliveries/presentation/hooks";
import { describeError } from "@/shared/errors";
import { includesText, SearchField, Select } from "@/shared/inputs";
import { confirm, Fab, FormScreen, IconButton, ListRow, ResourceList } from "@/shared/layout";
import { Banner, Button, LoadingState, TextField } from "@/shared/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { normalizePlate, validateVehicle, vehicleLabel, type Vehicle } from "../domain/Fleet";
import { useRemoveVehicle, useSaveVehicle, useVehicles } from "./hooks";

export function VehiclesScreen() {
  const router = useRouter();
  const { role } = useSession();
  const vehicles = useVehicles();
  const deliverymen = useDeliverymen(true);
  const remove = useRemoveVehicle();
  const [search, setSearch] = useState("");

  const nameOf = useMemo(() => {
    const map = new Map((deliverymen.data ?? []).map((d) => [d.id, d.name]));
    return (id: number | null) => (id === null ? null : (map.get(id) ?? null));
  }, [deliverymen.data]);

  const items = useMemo(
    () =>
      (vehicles.data ?? []).filter((v) =>
        includesText([v.plate, v.model, v.brand, nameOf(v.deliverymanId)], search),
      ),
    [vehicles.data, search, nameOf],
  );

  const askRemove = async (v: Vehicle) => {
    if (!(await confirm("Excluir veículo?", `${v.plate} será removido.`))) return;
    remove.mutate(v.id, {
      onError: (e) =>
        Alert.alert(
          "Não foi possível excluir",
          `${describeError(e)} Veículos com abastecimentos ou trocas registrados não podem ser excluídos.`,
        ),
    });
  };

  return (
    <ResourceList
      query={vehicles}
      items={items}
      keyExtractor={(v) => String(v.id)}
      header={
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Placa, modelo ou entregador"
        />
      }
      emptyTitle={search ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
      errorMessage={describeError}
      fab={<Fab label="Novo veículo" onPress={() => router.push("/vehicles/new")} />}
      renderItem={({ item }) => (
        <ListRow
          icon="car-outline"
          title={vehicleLabel(item)}
          subtitle={nameOf(item.deliverymanId) ?? "Sem entregador vinculado"}
          onPress={() => router.push(`/vehicles/${item.id}`)}
          right={
            isFleetManager(role) ? (
              <IconButton
                icon="trash-outline"
                label={`Excluir ${item.plate}`}
                tone="danger"
                onPress={() => void askRemove(item)}
              />
            ) : undefined
          }
        />
      )}
    />
  );
}

export function VehicleFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const vehicles = useVehicles();
  const existing = isNew ? undefined : vehicles.data?.find((v) => v.id === Number(id));

  if (vehicles.isLoading) return <LoadingState />;
  if (!isNew && !existing) return <Banner tone="error" message="Veículo não encontrado." />;

  return (
    <VehicleForm
      key={existing?.id ?? "new"}
      vehicle={existing}
      takenPlates={(vehicles.data ?? [])
        .filter((v) => v.id !== existing?.id)
        .map((v) => normalizePlate(v.plate))}
      onDone={() => router.back()}
    />
  );
}

function VehicleForm({
  vehicle,
  takenPlates,
  onDone,
}: {
  vehicle?: Vehicle;
  takenPlates: string[];
  onDone: () => void;
}) {
  const online = useIsOnline();
  const save = useSaveVehicle();
  const deliverymen = useDeliverymen(true);
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [brand, setBrand] = useState(vehicle?.brand ?? "");
  const [deliverymanId, setDeliverymanId] = useState<number | null>(vehicle?.deliverymanId ?? null);
  const [errors, setErrors] = useState<{ plate?: string; model?: string }>({});

  const options = useMemo(
    () => (deliverymen.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    [deliverymen.data],
  );

  const submit = () => {
    const found = validateVehicle({ plate, model });
    if (!found.plate && takenPlates.includes(normalizePlate(plate)))
      found.plate = "Placa já cadastrada.";
    setErrors(found);
    if (found.plate || found.model) return;
    save.mutate(
      {
        id: vehicle?.id ?? null,
        input: { plate, model, brand: brand.trim() || null, deliverymanId },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <FormScreen
      footer={
        <Button
          title={vehicle ? "Salvar alterações" : "Cadastrar veículo"}
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
        label="Placa"
        value={plate}
        onChangeText={(v) => setPlate(v.toUpperCase())}
        autoCapitalize="characters"
        maxLength={8}
        error={errors.plate}
        placeholder="ABC1D23"
      />
      <TextField label="Modelo" value={model} onChangeText={setModel} error={errors.model} />
      <TextField label="Marca (opcional)" value={brand} onChangeText={setBrand} />
      <Select
        label="Entregador responsável"
        value={deliverymanId}
        options={options}
        onChange={setDeliverymanId}
        placeholder="Nenhum"
        allowClear
        loading={deliverymen.isLoading}
      />
    </FormScreen>
  );
}
