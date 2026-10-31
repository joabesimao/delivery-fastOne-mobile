import { useIsOnline } from "@/core/query/useIsOnline";
import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useDeliverymen } from "@/modules/deliveries/presentation/hooks";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatNumber, parseDecimal } from "@/shared/format";
import { DateField, Select } from "@/shared/inputs";
import { FieldRow, FormScreen, ListGroup } from "@/shared/layout";
import { makeStyles } from "@/shared/ThemeProvider";
import { font, spacing } from "@/shared/theme";
import { Banner, Button, DetailRow, LoadingState, TextField } from "@/shared/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text } from "react-native";
import {
  computeTotalValue,
  lastKnownKm,
  validateFuelRefill,
  validateOilChange,
  vehicleLabel,
  type FieldErrors,
  type FuelRefill,
  type OilChange,
} from "../domain/Fleet";
import {
  useAddFuelRefill,
  useAddOilChange,
  useFuelRefillList,
  useFuelRefills,
  useMyVehicle,
  useOilChangeList,
  useOilChanges,
  useUpdateFuelRefill,
  useUpdateOilChange,
  useVehicles,
} from "./hooks";

const parseKm = (value: string) => Number(value.replace(/\D/g, "") || Number.NaN);

const formatDecimalInput = (value: number) => String(value).replace(".", ",");

interface Target {
  vehicleId: number | null;
  deliverymanId: number | null;
  date: Date;
}

// Quem registra e em qual veículo. O entregador usa o "meu veículo" e a data de agora;
// o gestor escolhe veículo, entregador e data (como no painel web).
function useTarget(initial?: { vehicleId: number; deliverymanId: number; date: Date }) {
  const { role } = useSession();
  const courier = isCourier(role);
  const mine = useMyVehicle(courier);
  const vehicles = useVehicles(!courier);
  const deliverymen = useDeliverymen(!courier);
  const [target, setTarget] = useState<Target>({
    vehicleId: initial?.vehicleId ?? null,
    deliverymanId: initial?.deliverymanId ?? null,
    date: initial?.date ?? new Date(),
  });

  if (courier) {
    const vehicle = mine.vehicle;
    const problem = mine.isLoading
      ? null
      : !vehicle
        ? "Escolha seu veículo na aba Frota antes de registrar."
        : vehicle.deliverymanId === null
          ? "Este veículo não tem entregador vinculado. Peça ao gestor para vincular."
          : null;
    return {
      courier,
      isLoading: mine.isLoading,
      problem,
      vehicleId: vehicle?.id ?? null,
      deliverymanId: vehicle?.deliverymanId ?? null,
      date: target.date,
      title: vehicle ? vehicleLabel(vehicle) : null,
      pickers: null,
    };
  }

  const vehicleOptions = (vehicles.data ?? []).map((v) => ({
    value: v.id,
    label: vehicleLabel(v),
  }));
  const deliverymanOptions = (deliverymen.data ?? []).map((d) => ({ value: d.id, label: d.name }));

  const pickers = (errors: { vehicle?: string; deliveryman?: string }) => (
    <>
      <Select
        label="Veículo"
        value={target.vehicleId}
        options={vehicleOptions}
        loading={vehicles.isLoading}
        error={errors.vehicle}
        onChange={(vehicleId) => {
          const linked = vehicles.data?.find((v) => v.id === vehicleId)?.deliverymanId ?? null;
          setTarget((t) => ({ ...t, vehicleId, deliverymanId: t.deliverymanId ?? linked }));
        }}
      />
      <Select
        label="Entregador"
        value={target.deliverymanId}
        options={deliverymanOptions}
        loading={deliverymen.isLoading}
        error={errors.deliveryman}
        onChange={(deliverymanId) => setTarget((t) => ({ ...t, deliverymanId }))}
      />
      <DateField
        label="Data"
        value={target.date}
        maximumDate={new Date()}
        onChange={(date) => setTarget((t) => ({ ...t, date }))}
      />
    </>
  );

  return {
    courier,
    isLoading: false,
    problem: null,
    vehicleId: target.vehicleId,
    deliverymanId: target.deliverymanId,
    date: target.date,
    title: null,
    pickers,
  };
}

const targetErrors = (vehicleId: number | null, deliverymanId: number | null) => ({
  ...(vehicleId === null && { vehicle: "Escolha o veículo." }),
  ...(deliverymanId === null && { deliveryman: "Escolha o entregador." }),
});

function useKnownKm(vehicleId: number | null) {
  const refills = useFuelRefills(vehicleId);
  const oilChanges = useOilChanges(vehicleId);
  return lastKnownKm(refills.data ?? [], oilChanges.data ?? []);
}

// Na edição o registro vem da lista geral (a mesma que a tela de registros carregou).
function useEditing<T extends { id: number }>(
  list: { data: T[] | undefined; isLoading: boolean },
  id?: string,
) {
  const editingId = id ? Number(id) : null;
  return {
    editingId,
    record: editingId === null ? undefined : list.data?.find((r) => r.id === editingId),
    isLoading: editingId !== null && list.isLoading,
  };
}

export function FuelRefillScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const list = useFuelRefillList({}, Boolean(id));
  const { editingId, record, isLoading } = useEditing(list, id);
  if (isLoading) return <LoadingState />;
  if (editingId !== null && !record)
    return <Banner tone="error" message="Abastecimento não encontrado." />;
  return <FuelRefillForm key={record?.id ?? "new"} record={record} />;
}

function FuelRefillForm({ record }: { record?: FuelRefill }) {
  const styles = useStyles();
  const router = useRouter();
  const online = useIsOnline();
  const target = useTarget(
    record && {
      vehicleId: record.vehicleId,
      deliverymanId: record.deliverymanId,
      date: record.refillDate,
    },
  );
  const knownKm = useKnownKm(target.vehicleId);
  const add = useAddFuelRefill();
  const update = useUpdateFuelRefill();
  const mutation = record ? update : add;

  const [km, setKm] = useState(record ? String(record.km) : "");
  const [liters, setLiters] = useState(record ? formatDecimalInput(record.liters) : "");
  const [price, setPrice] = useState(
    record?.pricePerLiter ? formatDecimalInput(record.pricePerLiter) : "",
  );
  const [errors, setErrors] = useState<
    FieldErrors<"km" | "liters" | "pricePerLiter" | "vehicle" | "deliveryman">
  >({});

  const values = {
    km: parseKm(km),
    liters: parseDecimal(liters),
    pricePerLiter: parseDecimal(price),
  };
  const total = computeTotalValue(values.liters, values.pricePerLiter);

  if (target.isLoading) return <LoadingState />;

  const submit = () => {
    const found = {
      ...validateFuelRefill(values),
      ...targetErrors(target.vehicleId, target.deliverymanId),
    };
    setErrors(found);
    if (
      Object.keys(found).length > 0 ||
      target.vehicleId === null ||
      target.deliverymanId === null ||
      total === null
    ) {
      return;
    }
    const input = {
      vehicleId: target.vehicleId,
      deliverymanId: target.deliverymanId,
      km: values.km,
      liters: values.liters,
      pricePerLiter: values.pricePerLiter,
      totalValue: total,
      refillDate: target.courier && !record ? new Date() : target.date,
    };
    const done = { onSuccess: () => router.back() };
    if (record) update.mutate({ id: record.id, input }, done);
    else add.mutate(input, done);
  };

  return (
    <FormScreen
      footer={
        <Button
          title={record ? "Salvar alterações" : "Registrar abastecimento"}
          onPress={submit}
          loading={mutation.isPending}
          disabled={Boolean(target.problem) || !online}
          style={styles.flex}
        />
      }
    >
      {target.title ? <Text style={styles.vehicle}>{target.title}</Text> : null}
      {target.problem ? <Banner tone="error" message={target.problem} /> : null}
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para registrar." /> : null}
      {mutation.isError ? <Banner tone="error" message={describeError(mutation.error)} /> : null}

      {target.pickers?.(errors)}

      <TextField
        label="Quilometragem atual (km)"
        value={km}
        onChangeText={(v) => setKm(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder={knownKm > 0 ? `Último registro: ${formatNumber(knownKm)}` : "Ex.: 15230"}
        error={errors.km}
      />
      <FieldRow>
        <TextField
          label="Litros"
          value={liters}
          onChangeText={setLiters}
          keyboardType="decimal-pad"
          placeholder="8,5"
          error={errors.liters}
        />
        <TextField
          label="Preço/litro"
          prefix="R$"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="6,19"
          error={errors.pricePerLiter}
          accessibilityLabel="Preço por litro"
        />
      </FieldRow>

      <ListGroup>
        <DetailRow label="Total" value={total === null ? "—" : formatCurrency(total)} />
        {target.courier && !record ? <DetailRow label="Data" value="Agora" /> : null}
      </ListGroup>
    </FormScreen>
  );
}

export function OilChangeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const list = useOilChangeList({}, Boolean(id));
  const { editingId, record, isLoading } = useEditing(list, id);
  if (isLoading) return <LoadingState />;
  if (editingId !== null && !record)
    return <Banner tone="error" message="Troca de óleo não encontrada." />;
  return <OilChangeForm key={record?.id ?? "new"} record={record} />;
}

function OilChangeForm({ record }: { record?: OilChange }) {
  const styles = useStyles();
  const router = useRouter();
  const online = useIsOnline();
  const target = useTarget(
    record && {
      vehicleId: record.vehicleId,
      deliverymanId: record.deliverymanId,
      date: record.changeDate,
    },
  );
  const knownKm = useKnownKm(target.vehicleId);
  const add = useAddOilChange();
  const update = useUpdateOilChange();
  const mutation = record ? update : add;

  const [km, setKm] = useState(record ? String(record.km) : "");
  const [errors, setErrors] = useState<FieldErrors<"km" | "vehicle" | "deliveryman">>({});

  const hint = useMemo(
    () =>
      record
        ? `Próxima troca atual: ${formatNumber(record.nextChangeKm)} km (recalculada ao salvar).`
        : "A próxima troca é calculada pelo intervalo configurado.",
    [record],
  );

  if (target.isLoading) return <LoadingState />;

  const submit = () => {
    const value = parseKm(km);
    const found = {
      ...validateOilChange({ km: value }),
      ...targetErrors(target.vehicleId, target.deliverymanId),
    };
    setErrors(found);
    if (Object.keys(found).length > 0 || target.vehicleId === null || target.deliverymanId === null)
      return;
    const input = {
      vehicleId: target.vehicleId,
      deliverymanId: target.deliverymanId,
      km: value,
      changeDate: target.courier && !record ? new Date() : target.date,
    };
    const done = { onSuccess: () => router.back() };
    if (record) update.mutate({ id: record.id, input }, done);
    else add.mutate(input, done);
  };

  return (
    <FormScreen
      footer={
        <Button
          title={record ? "Salvar alterações" : "Registrar troca de óleo"}
          onPress={submit}
          loading={mutation.isPending}
          disabled={Boolean(target.problem) || !online}
          style={styles.flex}
        />
      }
    >
      {target.title ? <Text style={styles.vehicle}>{target.title}</Text> : null}
      {target.problem ? <Banner tone="error" message={target.problem} /> : null}
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para registrar." /> : null}
      {mutation.isError ? <Banner tone="error" message={describeError(mutation.error)} /> : null}

      {target.pickers?.(errors)}

      <TextField
        label="Quilometragem da troca (km)"
        value={km}
        onChangeText={(v) => setKm(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder={knownKm > 0 ? `Último registro: ${formatNumber(knownKm)}` : "Ex.: 15230"}
        error={errors.km}
      />
      <Text style={styles.hint}>{hint}</Text>
    </FormScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  vehicle: { fontSize: font.title + 2, fontWeight: "600", color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted, paddingHorizontal: spacing.xs },
}));
