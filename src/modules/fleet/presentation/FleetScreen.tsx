import { describeError } from "@/shared/errors";
import { formatCurrency, formatDate, formatNumber } from "@/shared/format";
import { colors, font, radius, spacing } from "@/shared/theme";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
} from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  consumptionKmPerLiter,
  lastKnownKm,
  oilChangeStatus,
  vehicleLabel,
  type OilChangeStatus,
  type Vehicle,
} from "../domain/Fleet";
import { useFuelRefills, useMyVehicle, useOilChanges, useSetMyVehicle } from "./hooks";

const HISTORY_LIMIT = 10;

export function FleetScreen() {
  const { vehicle, vehicles, isLoading } = useMyVehicle();
  const [choosing, setChoosing] = useState(false);

  if (isLoading) return <LoadingState message="Carregando veículos..." />;
  if (vehicles.isError) {
    return <ErrorState message={describeError(vehicles.error)} onRetry={vehicles.refetch} />;
  }
  if (!vehicle || choosing) {
    return (
      <VehicleChooser
        vehicles={vehicles.data ?? []}
        currentId={vehicle?.id ?? null}
        onDone={() => setChoosing(false)}
        onCancel={vehicle ? () => setChoosing(false) : undefined}
      />
    );
  }
  return <VehicleOverview vehicle={vehicle} onChangeVehicle={() => setChoosing(true)} />;
}

function VehicleChooser({
  vehicles,
  currentId,
  onDone,
  onCancel,
}: {
  vehicles: Vehicle[];
  currentId: number | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const setMyVehicle = useSetMyVehicle();

  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon="car-outline"
        title="Nenhum veículo cadastrado"
        description="Peça ao gestor para cadastrar seu veículo no painel."
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Qual é o seu veículo?</Text>
      <Text style={styles.muted}>
        Usado nos registros de abastecimento e troca de óleo, e para separar as suas entregas.
      </Text>
      {vehicles.map((v) => {
        const selected = v.id === currentId;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setMyVehicle.mutate(v.id, { onSuccess: onDone })}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="car-outline"
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
            <View style={styles.flex}>
              <Text style={styles.optionTitle}>{v.plate}</Text>
              <Text style={styles.muted}>{[v.brand, v.model].filter(Boolean).join(" ")}</Text>
            </View>
            {v.deliverymanId === null ? (
              <Badge
                label="Sem entregador"
                color={colors.warning}
                background={colors.warningSoft}
              />
            ) : null}
            {selected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : null}
          </Pressable>
        );
      })}
      {onCancel ? <Button title="Cancelar" variant="ghost" onPress={onCancel} /> : null}
    </ScrollView>
  );
}

const oilPalette: Record<OilChangeStatus["kind"], { fg: string; bg: string; label: string }> = {
  unknown: { fg: colors.textMuted, bg: colors.border, label: "Sem registro" },
  ok: { fg: colors.success, bg: colors.successSoft, label: "Em dia" },
  soon: { fg: colors.warning, bg: colors.warningSoft, label: "Troca próxima" },
  overdue: { fg: colors.danger, bg: colors.dangerSoft, label: "Troca vencida" },
};

function VehicleOverview({
  vehicle,
  onChangeVehicle,
}: {
  vehicle: Vehicle;
  onChangeVehicle: () => void;
}) {
  const router = useRouter();
  const refills = useFuelRefills(vehicle.id);
  const oilChanges = useOilChanges(vehicle.id);

  const currentKm = lastKnownKm(refills.data ?? [], oilChanges.data ?? []);
  const oil = oilChangeStatus(oilChanges.data?.[0], currentKm);
  const palette = oilPalette[oil.kind];
  const refreshing = refills.isRefetching || oilChanges.isRefetching;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refills.refetch();
            void oilChanges.refetch();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <Card style={styles.vehicleCard}>
        <View style={styles.vehicleIcon}>
          <Ionicons name="car" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>{vehicle.plate}</Text>
          <Text style={styles.muted}>
            {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
          </Text>
          {currentKm > 0 ? <Text style={styles.muted}>{formatNumber(currentKm)} km</Text> : null}
        </View>
        <Button title="Trocar" variant="ghost" onPress={onChangeVehicle} />
      </Card>

      <Card style={styles.oilCard}>
        <View style={styles.oilHeader}>
          <Text style={styles.cardTitle}>Troca de óleo</Text>
          <Badge label={palette.label} color={palette.fg} background={palette.bg} />
        </View>
        {oil.kind === "unknown" ? (
          <Text style={styles.muted}>Nenhuma troca registrada para este veículo.</Text>
        ) : (
          <Text style={styles.muted}>
            Próxima troca aos {formatNumber(oil.nextChangeKm)} km
            {oil.remainingKm > 0
              ? ` (faltam ${formatNumber(oil.remainingKm)} km)`
              : ` (passou ${formatNumber(-oil.remainingKm)} km)`}
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          title="Abastecimento"
          icon="speedometer-outline"
          style={styles.flex}
          onPress={() => router.push("/fuel-refill")}
        />
        <Button
          title="Troca de óleo"
          icon="construct-outline"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push("/oil-change")}
        />
      </View>

      <SectionTitle>Abastecimentos</SectionTitle>
      {refills.isPending ? (
        <LoadingState />
      ) : refills.isError ? (
        <ErrorState message={describeError(refills.error)} onRetry={refills.refetch} />
      ) : refills.data.length === 0 ? (
        <Text style={styles.muted}>Nenhum abastecimento registrado.</Text>
      ) : (
        <Card style={styles.historyCard}>
          {refills.data.slice(0, HISTORY_LIMIT).map((refill, index) => {
            const consumption = consumptionKmPerLiter(refill);
            return (
              <View key={refill.id} style={[styles.historyRow, index > 0 && styles.historyDivider]}>
                <View style={styles.flex}>
                  <Text style={styles.historyTitle}>{formatDate(refill.refillDate)}</Text>
                  <Text style={styles.muted}>
                    {formatNumber(refill.km)} km · {formatNumber(refill.liters, 2)} L
                    {consumption ? ` · ${formatNumber(consumption, 1)} km/L` : ""}
                  </Text>
                </View>
                <Text style={styles.historyValue}>{formatCurrency(refill.totalValue)}</Text>
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>Trocas de óleo</SectionTitle>
      {oilChanges.isPending ? (
        <LoadingState />
      ) : oilChanges.isError ? (
        <ErrorState message={describeError(oilChanges.error)} onRetry={oilChanges.refetch} />
      ) : oilChanges.data.length === 0 ? (
        <Text style={styles.muted}>Nenhuma troca registrada.</Text>
      ) : (
        <Card style={styles.historyCard}>
          {oilChanges.data.slice(0, HISTORY_LIMIT).map((change, index) => (
            <View key={change.id} style={[styles.historyRow, index > 0 && styles.historyDivider]}>
              <View style={styles.flex}>
                <Text style={styles.historyTitle}>{formatDate(change.changeDate)}</Text>
                <Text style={styles.muted}>
                  Aos {formatNumber(change.km)} km · próxima aos {formatNumber(change.nextChangeKm)}{" "}
                  km
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}
      <Text style={styles.footnote}>{vehicleLabel(vehicle)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  heading: { fontSize: font.heading - 2, fontWeight: "800", color: colors.text },
  muted: { fontSize: font.small, color: colors.textMuted },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.85 },
  optionTitle: { fontSize: font.title, fontWeight: "700", color: colors.text },
  vehicleCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  oilCard: { gap: spacing.sm },
  oilHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: font.body, fontWeight: "700", color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm },
  historyCard: { paddingVertical: spacing.xs },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  historyTitle: { fontSize: font.body, fontWeight: "600", color: colors.text },
  historyValue: { fontSize: font.body, fontWeight: "700", color: colors.text },
  footnote: {
    fontSize: font.caption,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
