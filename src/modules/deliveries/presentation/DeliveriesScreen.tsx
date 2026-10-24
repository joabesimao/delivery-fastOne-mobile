import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { canOperate, isCourier } from "@/modules/auth/domain/Session";
import { Select } from "@/shared/inputs";
import { Fab, FormSheet } from "@/shared/layout";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useMyVehicle } from "@/modules/fleet/presentation/hooks";
import { describeError } from "@/shared/errors";
import { font, radius, spacing } from "@/shared/theme";
import { Banner, Button, EmptyState, ErrorState, LoadingState, Segmented } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
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
    ({ item }: { item: Delivery }) => (
      <DeliveryCard delivery={item} showDeliveryman={!filterMine} onPress={openDelivery} />
    ),
    [filterMine, openDelivery],
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
        ItemSeparatorComponent={Separator}
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

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Cliente, endereço, nº do pedido..."
                placeholderTextColor={colors.textSubtle}
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Buscar entrega"
              />
              {search ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={10}
                  accessibilityLabel="Limpar busca"
                >
                  <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
                </Pressable>
              ) : null}
            </View>

            {!courier ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersOpen(true)}
                style={styles.toggle}
              >
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <Text style={styles.toggleText}>
                  {filterCount > 0
                    ? `Filtros (${filterCount})`
                    : "Filtrar por entregador, cidade ou bairro"}
                </Text>
              </Pressable>
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
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: onlyMine }}
                onPress={() => setOnlyMine((v) => !v)}
                style={styles.toggle}
              >
                <Ionicons
                  name={onlyMine ? "checkbox" : "square-outline"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.toggleText}>Mostrar só as minhas entregas</Text>
              </Pressable>
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

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: spacing.sm },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 36 },
  toggleText: { fontSize: font.small, color: colors.text, fontWeight: "500" },
}));
