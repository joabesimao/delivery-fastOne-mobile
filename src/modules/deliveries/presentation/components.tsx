import { formatCurrency, formatRelative } from "@/shared/format";
import { colors, font, radius, spacing } from "@/shared/theme";
import { Badge } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { statusLabels, type Delivery, type DeliveryStatus } from "../domain/Delivery";

// Mesmas cores do painel web.
export const statusColors: Record<DeliveryStatus, { fg: string; bg: string }> = {
  actived: { fg: colors.primary, bg: colors.primarySoft },
  delivered: { fg: colors.warning, bg: colors.warningSoft },
  finished: { fg: colors.success, bg: colors.successSoft },
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const palette = statusColors[status];
  return <Badge label={statusLabels[status]} color={palette.fg} background={palette.bg} />;
}

interface DeliveryCardProps {
  delivery: Delivery;
  showDeliveryman: boolean;
  onPress: (id: number) => void;
}

export const DeliveryCard = memo(function DeliveryCard({
  delivery,
  showDeliveryman,
  onPress,
}: DeliveryCardProps) {
  const { address } = delivery;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${delivery.id}, ${delivery.client.name}, ${statusLabels[delivery.status]}`}
      onPress={() => onPress(delivery.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.id}>#{delivery.id}</Text>
        <StatusBadge status={delivery.status} />
        <Text style={styles.time}>{formatRelative(delivery.date)}</Text>
      </View>

      <Text style={styles.client} numberOfLines={1}>
        {delivery.client.name}
      </Text>

      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <Text style={styles.address} numberOfLines={2}>
          {address.street}, {address.number} · {address.neighborhood}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>
          {delivery.quantity} un · {formatCurrency(delivery.amount)}
        </Text>
        {showDeliveryman ? (
          <View style={styles.row}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {delivery.deliveryman?.name ?? "Sem entregador"}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: "#F0F4FF" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  id: { fontSize: font.small, fontWeight: "700", color: colors.textMuted },
  time: { marginLeft: "auto", fontSize: font.caption, color: colors.textSubtle },
  client: { fontSize: font.title - 1, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
  address: { flex: 1, fontSize: font.small, color: colors.textMuted },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  meta: { fontSize: font.small, color: colors.textMuted, fontWeight: "500", flexShrink: 1 },
});
