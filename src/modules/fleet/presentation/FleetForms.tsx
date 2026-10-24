import { useIsOnline } from "@/core/query/useIsOnline";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatNumber, parseDecimal } from "@/shared/format";
import { colors, font, spacing } from "@/shared/theme";
import { Banner, Button, Card, LoadingState, TextField } from "@/shared/ui";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import {
  computeTotalValue,
  lastKnownKm,
  validateFuelRefill,
  validateOilChange,
  vehicleLabel,
  type FieldErrors,
  type Vehicle,
} from "../domain/Fleet";
import {
  useAddFuelRefill,
  useAddOilChange,
  useFuelRefills,
  useMyVehicle,
  useOilChanges,
} from "./hooks";

const parseKm = (value: string) => Number(value.replace(/\D/g, "") || Number.NaN);

function FormShell({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Os formulários precisam do veículo escolhido e do entregador vinculado a ele.
function useFormVehicle(): { vehicle: Vehicle | null; isLoading: boolean; problem: string | null } {
  const { vehicle, isLoading } = useMyVehicle();
  if (isLoading) return { vehicle: null, isLoading, problem: null };
  if (!vehicle)
    return { vehicle, isLoading, problem: "Escolha seu veículo na aba Frota antes de registrar." };
  if (vehicle.deliverymanId === null) {
    return {
      vehicle,
      isLoading,
      problem: "Este veículo não tem entregador vinculado. Peça ao gestor para vincular no painel.",
    };
  }
  return { vehicle, isLoading, problem: null };
}

function useKnownKm(vehicleId: number | null) {
  const refills = useFuelRefills(vehicleId);
  const oilChanges = useOilChanges(vehicleId);
  return lastKnownKm(refills.data ?? [], oilChanges.data ?? []);
}

export function FuelRefillScreen() {
  const router = useRouter();
  const online = useIsOnline();
  const { vehicle, isLoading, problem } = useFormVehicle();
  const knownKm = useKnownKm(vehicle?.id ?? null);
  const addRefill = useAddFuelRefill();

  const [km, setKm] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"km" | "liters" | "pricePerLiter">>({});

  const values = {
    km: parseKm(km),
    liters: parseDecimal(liters),
    pricePerLiter: parseDecimal(price),
  };
  const total = computeTotalValue(values.liters, values.pricePerLiter);

  if (isLoading) return <LoadingState />;

  const submit = () => {
    const found = validateFuelRefill(values);
    setErrors(found);
    if (Object.keys(found).length > 0 || !vehicle?.deliverymanId || total === null) return;

    addRefill.mutate(
      {
        vehicleId: vehicle.id,
        deliverymanId: vehicle.deliverymanId,
        km: values.km,
        liters: values.liters,
        pricePerLiter: values.pricePerLiter,
        totalValue: total,
        refillDate: new Date(),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <FormShell>
      {vehicle ? <Text style={styles.vehicle}>{vehicleLabel(vehicle)}</Text> : null}
      {problem ? <Banner tone="error" message={problem} /> : null}
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para registrar." /> : null}
      {addRefill.isError ? <Banner tone="error" message={describeError(addRefill.error)} /> : null}

      <TextField
        label="Quilometragem atual (km)"
        value={km}
        onChangeText={(v) => setKm(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder={knownKm > 0 ? `Último registro: ${formatNumber(knownKm)}` : "Ex.: 15230"}
        error={errors.km}
      />
      <TextField
        label="Litros"
        value={liters}
        onChangeText={setLiters}
        keyboardType="decimal-pad"
        placeholder="Ex.: 8,5"
        error={errors.liters}
      />
      <TextField
        label="Preço por litro"
        prefix="R$"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Ex.: 6,19"
        error={errors.pricePerLiter}
      />

      <Card style={styles.total}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total === null ? "—" : formatCurrency(total)}</Text>
      </Card>

      <Text style={styles.hint}>
        Data do registro: agora. Para lançamentos retroativos, use o painel.
      </Text>

      <Button
        title="Registrar abastecimento"
        icon="checkmark"
        onPress={submit}
        loading={addRefill.isPending}
        disabled={Boolean(problem) || !online}
      />
    </FormShell>
  );
}

export function OilChangeScreen() {
  const router = useRouter();
  const online = useIsOnline();
  const { vehicle, isLoading, problem } = useFormVehicle();
  const knownKm = useKnownKm(vehicle?.id ?? null);
  const addOilChange = useAddOilChange();

  const [km, setKm] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"km">>({});

  if (isLoading) return <LoadingState />;

  const submit = () => {
    const value = parseKm(km);
    const found = validateOilChange({ km: value });
    setErrors(found);
    if (Object.keys(found).length > 0 || !vehicle?.deliverymanId) return;

    addOilChange.mutate(
      {
        vehicleId: vehicle.id,
        deliverymanId: vehicle.deliverymanId,
        km: value,
        changeDate: new Date(),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <FormShell>
      {vehicle ? <Text style={styles.vehicle}>{vehicleLabel(vehicle)}</Text> : null}
      {problem ? <Banner tone="error" message={problem} /> : null}
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para registrar." /> : null}
      {addOilChange.isError ? (
        <Banner tone="error" message={describeError(addOilChange.error)} />
      ) : null}

      <TextField
        label="Quilometragem da troca (km)"
        value={km}
        onChangeText={(v) => setKm(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder={knownKm > 0 ? `Último registro: ${formatNumber(knownKm)}` : "Ex.: 15230"}
        error={errors.km}
      />
      <Text style={styles.hint}>
        A próxima troca é calculada pelo intervalo configurado no painel.
      </Text>

      <Button
        title="Registrar troca de óleo"
        icon="checkmark"
        onPress={submit}
        loading={addOilChange.isPending}
        disabled={Boolean(problem) || !online}
      />
    </FormShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  vehicle: { fontSize: font.title, fontWeight: "700", color: colors.text },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: font.body, color: colors.textMuted, fontWeight: "600" },
  totalValue: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted },
});
