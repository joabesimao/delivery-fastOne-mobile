import { isFleetManager } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useDeliverymen } from "@/modules/deliveries/presentation/hooks";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatDate, formatNumber } from "@/shared/format";
import { Select } from "@/shared/inputs";
import {
  confirm,
  Fab,
  IconButton,
  ListRow,
  ResourceList,
  StatCard,
  StatGrid,
} from "@/shared/layout";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { consumptionKmPerLiter, vehicleLabel, type FleetFilter } from "../domain/Fleet";
import {
  useFuelRefillList,
  useOilChangeList,
  useRemoveFuelRefill,
  useRemoveOilChange,
  useVehicles,
} from "./hooks";

// Filtros por veículo e entregador, iguais aos do painel web.
function useFleetFilters() {
  const vehicles = useVehicles();
  const deliverymen = useDeliverymen(true);
  const [filter, setFilter] = useState<FleetFilter>({});

  const header = (
    <View style={{ gap: 12 }}>
      <Select
        label="Veículo"
        value={filter.vehicleId ?? null}
        options={(vehicles.data ?? []).map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
        onChange={(vehicleId) => setFilter((f) => ({ ...f, vehicleId: vehicleId ?? undefined }))}
        placeholder="Todos os veículos"
        allowClear
      />
      <Select
        label="Entregador"
        value={filter.deliverymanId ?? null}
        options={(deliverymen.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
        onChange={(deliverymanId) =>
          setFilter((f) => ({ ...f, deliverymanId: deliverymanId ?? undefined }))
        }
        placeholder="Todos os entregadores"
        allowClear
      />
    </View>
  );

  return { filter, header };
}

const deleteFailed = (error: unknown) =>
  Alert.alert("Não foi possível excluir", describeError(error));

export function FuelRefillsScreen() {
  const router = useRouter();
  const { role } = useSession();
  const manager = isFleetManager(role);
  const { filter, header } = useFleetFilters();
  const refills = useFuelRefillList(filter);
  const remove = useRemoveFuelRefill();
  const items = useMemo(() => refills.data ?? [], [refills.data]);

  const totals = useMemo(() => {
    const liters = items.reduce((sum, r) => sum + r.liters, 0);
    const value = items.reduce((sum, r) => sum + r.totalValue, 0);
    const driven = items.reduce((sum, r) => sum + (r.kmDriven ?? 0), 0);
    const litersWithKm = items.filter((r) => r.kmDriven).reduce((sum, r) => sum + r.liters, 0);
    return { liters, value, consumption: litersWithKm > 0 ? driven / litersWithKm : null };
  }, [items]);

  const askRemove = async (id: number) => {
    const ok = await confirm(
      "Excluir abastecimento?",
      "O km rodado e o consumo do abastecimento seguinte serão recalculados.",
    );
    if (ok) remove.mutate(id, { onError: deleteFailed });
  };

  return (
    <ResourceList
      query={refills}
      items={items}
      keyExtractor={(r) => String(r.id)}
      header={
        <>
          {header}
          {items.length > 0 ? (
            <StatGrid>
              <StatCard
                icon="water-outline"
                label="Litros"
                value={formatNumber(totals.liters, 1)}
              />
              <StatCard
                icon="cash-outline"
                label="Gasto"
                value={formatCurrency(totals.value)}
                tone="warning"
              />
              <StatCard
                icon="speedometer-outline"
                label="Consumo médio"
                value={totals.consumption ? `${formatNumber(totals.consumption, 1)} km/L` : "—"}
                tone="success"
              />
              <StatCard icon="list-outline" label="Registros" value={String(items.length)} />
            </StatGrid>
          ) : null}
        </>
      }
      emptyTitle="Nenhum abastecimento"
      emptyDescription="Ajuste os filtros ou registre um abastecimento."
      errorMessage={describeError}
      fab={<Fab label="Abastecimento" onPress={() => router.push("/fuel-refill")} />}
      renderItem={({ item }) => {
        const consumption = consumptionKmPerLiter(item);
        return (
          <ListRow
            icon="speedometer-outline"
            title={`${item.vehiclePlate} · ${formatCurrency(item.totalValue)}`}
            subtitle={`${formatNumber(item.liters, 2)} L · ${formatNumber(item.km)} km${
              consumption ? ` · ${formatNumber(consumption, 1)} km/L` : ""
            }`}
            meta={`${formatDate(item.refillDate)} · ${item.deliverymanName || "—"}`}
            onPress={
              manager
                ? () => router.push({ pathname: "/fuel-refill", params: { id: item.id } })
                : undefined
            }
            right={
              manager ? (
                <IconButton
                  icon="trash-outline"
                  label="Excluir abastecimento"
                  tone="danger"
                  onPress={() => void askRemove(item.id)}
                />
              ) : undefined
            }
          />
        );
      }}
    />
  );
}

export function OilChangesScreen() {
  const router = useRouter();
  const { role } = useSession();
  const manager = isFleetManager(role);
  const { filter, header } = useFleetFilters();
  const changes = useOilChangeList(filter);
  const remove = useRemoveOilChange();

  const askRemove = async (id: number) => {
    if (await confirm("Excluir troca de óleo?", "O registro será removido do histórico.")) {
      remove.mutate(id, { onError: deleteFailed });
    }
  };

  return (
    <ResourceList
      query={changes}
      items={changes.data ?? []}
      keyExtractor={(c) => String(c.id)}
      header={header}
      emptyTitle="Nenhuma troca de óleo"
      emptyDescription="Ajuste os filtros ou registre uma troca."
      errorMessage={describeError}
      fab={<Fab label="Troca de óleo" onPress={() => router.push("/oil-change")} />}
      renderItem={({ item }) => (
        <ListRow
          icon="construct-outline"
          title={`${item.vehiclePlate} · ${formatNumber(item.km)} km`}
          subtitle={`Próxima troca: ${formatNumber(item.nextChangeKm)} km`}
          meta={`${formatDate(item.changeDate)} · ${item.deliverymanName || "—"}`}
          onPress={
            manager
              ? () => router.push({ pathname: "/oil-change", params: { id: item.id } })
              : undefined
          }
          right={
            manager ? (
              <IconButton
                icon="trash-outline"
                label="Excluir troca"
                tone="danger"
                onPress={() => void askRemove(item.id)}
              />
            ) : undefined
          }
        />
      )}
    />
  );
}
