import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { canOperate, isCourier } from "@/modules/auth/domain/Session";
import { SearchField, Select } from "@/shared/inputs";
import { Fab, FormSheet, GroupedItem, GroupSeparator } from "@/shared/layout";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useMyVehicle } from "@/modules/fleet/presentation/hooks";
import { describeError } from "@/shared/errors";
import { font, spacing } from "@/shared/theme";
import { Banner, Button, EmptyState, ErrorState, LoadingState, Segmented } from "@/shared/ui";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Checkbox } from "react-native-paper";
import {
  activeFilterCount,
  countByStatus,
  filterOptions,
  matchesFilters,
  matchesSearch,
  NO_FILTERS,
  sortForWork,
  type Delivery,
  type DeliveryFilters,
  type DeliveryStatus,
} from "../domain/Delivery";
import { DeliveryCard } from "./components";
import { useDeliveries } from "./hooks";

export function DeliveriesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { role } = useSession();
  const courier = isCourier(role);
  const { deliverymanId, vehicle, isLoading: vehicleLoading } = useMyVehicle(courier);
  const deliveries = useDeliveries();

  const [status, setStatus] = useState<DeliveryStatus>("actived");
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);
  const [filters, setFilters] = useState<DeliveryFilters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(filters);

  // Sem vínculo conta → entregador na API, o filtro "minhas" usa o entregador do veículo escolhido.
  // É só conveniência de tela: quem garante o acesso é o backend.
  const filterMine = courier && onlyMine && deliverymanId !== null;

  const scoped = useMemo(() => {
    const all = deliveries.data ?? [];
    const mine = filterMine ? all.filter((d) => d.deliveryman?.id === deliverymanId) : all;
    return mine.filter((d) => matchesFilters(d, filters));
  }, [deliveries.data, filterMine, deliverymanId, filters]);

  const options = useMemo(
    () => filterOptions(deliveries.data ?? [], filters.city),
    [deliveries.data, filters.city],
  );

  const counts = useMemo(() => countByStatus(scoped), [scoped]);

  const visible = useMemo(
    () => sortForWork(scoped.filter((d) => d.status === status && matchesSearch(d, search))),
    [scoped, status, search],
  );

  const openDelivery = useCallback((id: number) => router.push(`/delivery/${id}`), [router]);

  const renderItem = useCallback(
    ({ item, index }: { item: Delivery; index: number }) => (
      <GroupedItem index={index} count={visible.length}>
        <DeliveryCard delivery={item} showDeliveryman={!filterMine} onPress={openDelivery} />
      </GroupedItem>
    ),
    [filterMine, openDelivery, visible.length],
  );

  if (deliveries.isPending) return <LoadingState message="Carregando entregas..." />;
  if (deliveries.isError && !deliveries.data) {
    return <ErrorState message={describeError(deliveries.error)} onRetry={deliveries.refetch} />;
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={GroupSeparator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={deliveries.isRefetching}
            onRefresh={() => void deliveries.refetch()}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {deliveries.isError ? (
              <Banner tone="error" message={describeError(deliveries.error)} />
            ) : null}

            {courier && !vehicleLoading && !vehicle ? (
              <Pressable onPress={() => router.push("/fleet")} accessibilityRole="link">
                <Banner
                  tone="info"
                  message="Escolha seu veículo na aba Frota para ver só as suas entregas."
                />
              </Pressable>
            ) : null}

            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Cliente, endereço, nº do pedido..."
            />

            {!courier ? (
              <Button
                title={
                  filterCount > 0
                    ? `Filtros (${filterCount})`
                    : "Filtrar por entregador, cidade ou bairro"
                }
                variant="ghost"
                icon="options-outline"
                onPress={() => setFiltersOpen(true)}
                style={styles.filters}
              />
            ) : null}

            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: "actived", label: "Ativas", count: counts.actived },
                { value: "delivered", label: "Em entrega", count: counts.delivered },
                { value: "finished", label: "Finalizadas", count: counts.finished },
              ]}
            />

            {courier && deliverymanId !== null ? (
              <Checkbox.Item
                label="Mostrar só as minhas entregas"
                status={onlyMine ? "checked" : "unchecked"}
                onPress={() => setOnlyMine((v) => !v)}
                color={colors.primary}
                mode="android"
                position="leading"
                style={styles.checkbox}
                labelStyle={styles.checkboxLabel}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={search ? "Nada encontrado" : "Nenhuma entrega aqui"}
            description={
              search
                ? "Nenhuma entrega corresponde à busca."
                : "Quando houver entregas neste status, elas aparecem aqui."
            }
          />
        }
      />
      {canOperate(role) ? (
        <Fab label="Nova entrega" onPress={() => router.push("/new-delivery")} />
      ) : null}
      <FormSheet
        visible={filtersOpen}
        title="Filtros"
        onClose={() => setFiltersOpen(false)}
        footer={
          <>
            <Button
              title="Limpar"
              variant="secondary"
              onPress={() => setFilters(NO_FILTERS)}
              style={styles.flex}
            />
            <Button title="Aplicar" onPress={() => setFiltersOpen(false)} style={styles.flex} />
          </>
        }
      >
        <Select
          label="Entregador"
          value={filters.deliverymanId}
          options={[
            { value: 0, label: "Sem entregador" },
            ...options.deliverymen.map((d) => ({ value: d.id, label: d.name })),
          ]}
          onChange={(deliverymanId) => setFilters((f) => ({ ...f, deliverymanId }))}
          placeholder="Todos"
          allowClear
        />
        <Select
          label="Cidade"
          value={filters.city}
          options={options.cities.map((c) => ({ value: c, label: c }))}
          onChange={(city) => setFilters((f) => ({ ...f, city, neighborhood: null }))}
          placeholder="Todas"
          allowClear
        />
        <Select
          label="Bairro"
          value={filters.neighborhood}
          options={options.neighborhoods.map((n) => ({ value: n, label: n }))}
          onChange={(neighborhood) => setFilters((f) => ({ ...f, neighborhood }))}
          placeholder="Todos"
          allowClear
        />
      </FormSheet>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  filters: { alignSelf: "flex-start", marginLeft: -spacing.sm },
  checkbox: { paddingHorizontal: 0, paddingVertical: 0 },
  checkboxLabel: { fontSize: font.small, fontWeight: "500", textAlign: "left" },
}));
