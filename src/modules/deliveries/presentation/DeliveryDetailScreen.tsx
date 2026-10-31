import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { useIsOnline } from "@/core/query/useIsOnline";
import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatDateTime, phoneDigits, phoneMask } from "@/shared/format";
import { font, fontFamily, radius, spacing } from "@/shared/theme";
import { ListGroup, ListRow } from "@/shared/layout";
import { Banner, Button, DetailRow, ErrorState, LoadingState, SectionTitle } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { TouchableRipple } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatAddress,
  nextStatus,
  type Delivery,
  type DeliveryPerson,
  type DeliveryStatus,
} from "../domain/Delivery";
import { StatusBadge } from "./components";
import {
  useAssignDeliveryman,
  useDelivery,
  useDeliverymen,
  useUpdateDeliveryStatus,
} from "./hooks";

const actionFor: Record<
  DeliveryStatus,
  { title: string; icon: "bicycle" | "checkmark-done" } | null
> = {
  actived: { title: "Saí para entrega", icon: "bicycle" },
  delivered: { title: "Finalizar entrega", icon: "checkmark-done" },
  finished: null,
};

const CONFLICT_MESSAGE =
  "Este pedido já foi atualizado por outra pessoa. Os dados foram recarregados.";

const openUrl = (url: string, failure: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Não foi possível abrir", failure));

export function DeliveryDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const { role } = useSession();
  const canManage = !isCourier(role);
  const online = useIsOnline();

  const delivery = useDelivery(id);
  const updateStatus = useUpdateDeliveryStatus();
  const assign = useAssignDeliveryman();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (delivery.isPending) return <LoadingState />;
  if (delivery.isError && !delivery.data) {
    return <ErrorState message={describeError(delivery.error)} onRetry={delivery.refetch} />;
  }

  const order = delivery.data;
  const next = nextStatus(order.status);
  const action = actionFor[order.status];
  const mutationError = updateStatus.error ?? assign.error;

  const advance = () => {
    if (!next) return;
    const run = () => {
      updateStatus.reset();
      assign.reset();
      updateStatus.mutate({ id: order.id, status: next });
    };
    if (next === "finished") {
      Alert.alert(
        "Finalizar entrega?",
        `Confirme a entrega do pedido #${order.id} para ${order.client.name}.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Finalizar", onPress: run },
        ],
      );
    } else {
      run();
    }
  };

  const chooseDeliveryman = (person: DeliveryPerson) => {
    setPickerOpen(false);
    if (person.id === order.deliveryman?.id) return;
    updateStatus.reset();
    assign.reset();
    assign.mutate({ id: order.id, deliveryman: person });
  };

  const clientPhone = phoneDigits(order.client.phone);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={delivery.isRefetching}
            onRefresh={() => void delivery.refetch()}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.orderId}>
              Pedido #{order.id} · {formatDateTime(order.date)}
            </Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.clientName} accessibilityRole="header">
            {order.client.name}
          </Text>
          <Text style={styles.address}>{formatAddress(order.address)}</Text>
          {order.address.reference ? (
            <Text style={styles.reference}>Ref.: {order.address.reference}</Text>
          ) : null}
          <View style={styles.heroActions}>
            <Button
              title="Mapa"
              icon="navigate-outline"
              variant="secondary"
              style={styles.flex}
              onPress={() =>
                openUrl(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    formatAddress(order.address),
                  )}`,
                  "Nenhum app de mapas disponível.",
                )
              }
            />
            {clientPhone ? (
              <Button
                title={phoneMask(clientPhone)}
                icon="call-outline"
                variant="secondary"
                style={styles.flex}
                onPress={() =>
                  openUrl(`tel:${clientPhone}`, "O aparelho não conseguiu iniciar a ligação.")
                }
              />
            ) : null}
          </View>
        </View>

        {!online ? (
          <Banner
            tone="error"
            message="Sem internet. As ações ficam bloqueadas até a conexão voltar."
          />
        ) : null}
        {mutationError ? (
          <Banner
            tone="error"
            message={describeError(mutationError, { conflict: CONFLICT_MESSAGE })}
          />
        ) : null}
        {updateStatus.isSuccess && order.status === "finished" ? (
          <Banner tone="success" message="Entrega finalizada." />
        ) : null}

        <SectionTitle>Pedido</SectionTitle>
        <ListGroup>
          <DetailRow label="Quantidade" value={order.quantity} />
          <DetailRow label="Valor" value={formatCurrency(order.amount)} />
          {order.finishedAt ? (
            <DetailRow label="Finalizado em" value={formatDateTime(order.finishedAt)} />
          ) : null}
        </ListGroup>

        <SectionTitle>Entregador</SectionTitle>
        <ListGroup>
          <ListRow
            title={order.deliveryman?.name ?? "Sem entregador"}
            subtitle={order.deliveryman?.phone ? phoneMask(order.deliveryman.phone) : undefined}
            muted={!order.deliveryman}
            right={
              canManage && order.status !== "finished" ? (
                <Button
                  title={order.deliveryman ? "Trocar" : "Atribuir"}
                  variant="ghost"
                  disabled={!online}
                  loading={assign.isPending}
                  onPress={() => setPickerOpen(true)}
                />
              ) : undefined
            }
          />
        </ListGroup>
      </ScrollView>

      {action ? (
        <SafeAreaView edges={["bottom"]} style={styles.footer}>
          <Button
            title={action.title}
            icon={action.icon}
            onPress={advance}
            loading={updateStatus.isPending}
            disabled={!online || assign.isPending}
          />
        </SafeAreaView>
      ) : null}

      {canManage ? (
        <DeliverymanPicker
          visible={pickerOpen}
          current={order}
          onClose={() => setPickerOpen(false)}
          onSelect={chooseDeliveryman}
        />
      ) : null}
    </View>
  );
}

function DeliverymanPicker({
  visible,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: Delivery;
  onClose: () => void;
  onSelect: (person: DeliveryPerson) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const deliverymen = useDeliverymen(visible);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <Text style={styles.sheetTitle}>Escolha o entregador</Text>
        {deliverymen.isPending ? (
          <LoadingState />
        ) : deliverymen.isError ? (
          <ErrorState message={describeError(deliverymen.error)} onRetry={deliverymen.refetch} />
        ) : (
          <FlatList
            data={deliverymen.data}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const selected = item.id === current.deliveryman?.id;
              return (
                <TouchableRipple
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(item)}
                  style={styles.option}
                >
                  <>
                    <View style={styles.flex}>
                      <Text style={styles.optionTitle}>{item.name}</Text>
                      {item.phone ? (
                        <Text style={styles.optionSubtitle}>{phoneMask(item.phone)}</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary} />
                    ) : null}
                  </>
                </TouchableRipple>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { gap: spacing.xs, paddingBottom: spacing.sm },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  orderId: { fontFamily: fontFamily.mono, fontSize: font.small, color: colors.textMuted },
  clientName: {
    fontSize: font.heading,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: spacing.xs,
  },
  address: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  reference: { fontSize: font.small, color: colors.textMuted },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    fontSize: font.title,
    fontWeight: "600",
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  optionTitle: { fontSize: font.body, fontWeight: "500", color: colors.text },
  optionSubtitle: { fontSize: font.small, color: colors.textMuted },
}));
