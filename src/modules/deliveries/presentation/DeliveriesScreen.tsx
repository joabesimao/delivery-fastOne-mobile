import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { useMyVehicle } from "@/modules/fleet/presentation/hooks";
import { describeError } from "@/shared/errors";
import { colors, font, radius, spacing } from "@/shared/theme";
import { Banner, EmptyState, ErrorState, LoadingState, Segmented } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  countByStatus,
  matchesSearch,
  sortForWork,
  type Delivery,
  type DeliveryStatus,
} from "../domain/Delivery";
import { DeliveryCard } from "./components";
import { useDeliveries } from "./hooks";

export function DeliveriesScreen() {
  const router = useRouter();
  const { role } = useSession();
  const courier = isCourier(role);
  const { deliverymanId, vehicle, isLoading: vehicleLoading } = useMyVehicle(courier);
  const deliveries = useDeliveries();

  const [status, setStatus] = useState<DeliveryStatus>("actived");
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);

  // Sem vínculo conta → entregador na API, o filtro "minhas" usa o entregador do veículo escolhido.
  // É só conveniência de tela: quem garante o acesso é o backend.
  const filterMine = courier && onlyMine && deliverymanId !== null;

  const scoped = useMemo(() => {
    const all = deliveries.data ?? [];
    return filterMine ? all.filter((d) => d.deliveryman?.id === deliverymanId) : all;
  }, [deliveries.data, filterMine, deliverymanId]);

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
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
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
});
