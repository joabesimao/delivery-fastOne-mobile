import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatDate, formatNumber } from "@/shared/format";
import { font, fontFamily, spacing, type ThemeColors } from "@/shared/theme";
import { ListGroup, ListRow } from "@/shared/layout";
import {
  Badge,
  Button,
  DetailRow,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
} from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import {
  consumptionKmPerLiter,
  lastKnownKm,
  oilChangeStatus,
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
  const styles = useStyles();
  const { colors } = useTheme();
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
      <View style={styles.intro}>
        <Text style={styles.heading}>Qual é o seu veículo?</Text>
        <Text style={styles.muted}>
          Usado nos registros de abastecimento e troca de óleo, e para separar as suas entregas.
        </Text>
      </View>
      <ListGroup>
        {vehicles.map((v) => {
          const selected = v.id === currentId;
          return (
            <TouchableRipple
              key={v.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMyVehicle.mutate(v.id, { onSuccess: onDone })}
              style={styles.option}
            >
              <>
                <View style={styles.flex}>
                  <Text style={styles.plate}>{v.plate}</Text>
                  <Text style={styles.muted}>
                    {[v.brand, v.model].filter(Boolean).join(" ")}
                    {v.deliverymanId === null ? " · sem entregador vinculado" : ""}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
              </>
            </TouchableRipple>
          );
        })}
      </ListGroup>
      {onCancel ? <Button title="Cancelar" variant="ghost" onPress={onCancel} /> : null}
    </ScrollView>
  );
}

const oilPalette = (
  colors: ThemeColors,
): Record<OilChangeStatus["kind"], { fg: string; bg: string; label: string }> => ({
  unknown: { fg: colors.textMuted, bg: colors.border, label: "Sem registro" },
  ok: { fg: colors.success, bg: colors.successSoft, label: "Em dia" },
  soon: { fg: colors.warning, bg: colors.warningSoft, label: "Troca próxima" },
  overdue: { fg: colors.danger, bg: colors.dangerSoft, label: "Troca vencida" },
});

function VehicleOverview({
  vehicle,
  onChangeVehicle,
}: {
  vehicle: Vehicle;
  onChangeVehicle: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const refills = useFuelRefills(vehicle.id);
  const oilChanges = useOilChanges(vehicle.id);

  const currentKm = lastKnownKm(refills.data ?? [], oilChanges.data ?? []);
  const oil = oilChangeStatus(oilChanges.data?.[0], currentKm);
  const palette = oilPalette(colors)[oil.kind];
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
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroPlate} accessibilityRole="header">
            {vehicle.plate}
          </Text>
          <Button title="Trocar" variant="ghost" onPress={onChangeVehicle} />
        </View>
        <Text style={styles.muted}>
          {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
          {currentKm > 0 ? ` · ${formatNumber(currentKm)} km rodados` : ""}
        </Text>
      </View>

      <ListGroup>
        <DetailRow
          label="Troca de óleo"
          value={<Badge label={palette.label} color={palette.fg} />}
        />
        {oil.kind === "unknown" ? null : (
          <DetailRow label="Próxima troca" value={`${formatNumber(oil.nextChangeKm)} km`} />
        )}
        {oil.kind === "unknown" ? null : (
          <DetailRow
            label={oil.remainingKm > 0 ? "Faltam" : "Passou"}
            value={`${formatNumber(Math.abs(oil.remainingKm))} km`}
          />
        )}
      </ListGroup>

      <View style={styles.actions}>
        <Button title="Abastecer" style={styles.flex} onPress={() => router.push("/fuel-refill")} />
        <Button
          title="Troca de óleo"
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
        <ListGroup>
          {refills.data.slice(0, HISTORY_LIMIT).map((refill) => {
            const consumption = consumptionKmPerLiter(refill);
            return (
              <ListRow
                key={refill.id}
                title={formatDate(refill.refillDate)}
                subtitle={`${formatNumber(refill.km)} km · ${formatNumber(refill.liters, 2)} L${
                  consumption ? ` · ${formatNumber(consumption, 1)} km/L` : ""
                }`}
                right={<Text style={styles.amount}>{formatCurrency(refill.totalValue)}</Text>}
              />
            );
          })}
        </ListGroup>
      )}

      <SectionTitle>Trocas de óleo</SectionTitle>
      {oilChanges.isPending ? (
        <LoadingState />
      ) : oilChanges.isError ? (
        <ErrorState message={describeError(oilChanges.error)} onRetry={oilChanges.refetch} />
      ) : oilChanges.data.length === 0 ? (
        <Text style={styles.muted}>Nenhuma troca registrada.</Text>
      ) : (
        <ListGroup>
          {oilChanges.data.slice(0, HISTORY_LIMIT).map((change) => (
            <ListRow
              key={change.id}
              title={formatDate(change.changeDate)}
              subtitle={`Aos ${formatNumber(change.km)} km · próxima aos ${formatNumber(
                change.nextChangeKm,
              )} km`}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { gap: spacing.xs, marginBottom: spacing.sm },
  heading: { fontSize: font.heading - 2, fontWeight: "600", color: colors.text },
  muted: { fontSize: font.small, color: colors.textMuted },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  plate: {
    fontFamily: fontFamily.monoMedium,
    fontSize: font.body,
    color: colors.text,
    letterSpacing: 1,
  },
  hero: { gap: 2, paddingBottom: spacing.xs },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroPlate: {
    fontFamily: fontFamily.monoMedium,
    fontSize: font.heading + 4,
    color: colors.text,
    letterSpacing: 2,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  amount: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
}));
