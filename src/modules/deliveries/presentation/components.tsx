import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { formatCurrency, formatRelative } from "@/shared/format";
import { font, spacing, type ThemeColors } from "@/shared/theme";
import { Badge } from "@/shared/ui";
import { memo } from "react";
import { Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import { statusLabels, type Delivery, type DeliveryStatus } from "../domain/Delivery";

// Mesmas cores do painel web.
export const statusColors = (
  colors: ThemeColors,
): Record<DeliveryStatus, { fg: string; bg: string }> => ({
  actived: { fg: colors.primary, bg: colors.primarySoft },
  delivered: { fg: colors.warning, bg: colors.warningSoft },
  finished: { fg: colors.success, bg: colors.successSoft },
});

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const { colors } = useTheme();
  const palette = statusColors(colors)[status];
  return <Badge label={statusLabels[status]} color={palette.fg} />;
}

interface DeliveryCardProps {
  delivery: Delivery;
  showDeliveryman: boolean;
  onPress: (id: number) => void;
}

// Linha da lista de entregas. O status já é o filtro da tela, então não se repete aqui.
export const DeliveryCard = memo(function DeliveryCard({
  delivery,
  showDeliveryman,
  onPress,
}: DeliveryCardProps) {
  const styles = useStyles();
  const { address } = delivery;
  const deliveryman = delivery.deliveryman?.name ?? "Sem entregador";
  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={`Pedido ${delivery.id}, ${delivery.client.name}, ${statusLabels[delivery.status]}`}
      onPress={() => onPress(delivery.id)}
      style={styles.row}
    >
      <>
        <View style={styles.main}>
          <Text style={styles.top}>
            #{delivery.id} · {formatRelative(delivery.date)}
          </Text>
          <Text style={styles.client} numberOfLines={1}>
            {delivery.client.name}
          </Text>
          <Text style={styles.address} numberOfLines={2}>
            {address.street}, {address.number} · {address.neighborhood}
          </Text>
          {showDeliveryman ? (
            <Text style={styles.top} numberOfLines={1}>
              {deliveryman}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>
          <Text style={styles.amount}>{formatCurrency(delivery.amount)}</Text>
          <Text style={styles.top}>{delivery.quantity} un</Text>
        </View>
      </>
    </TouchableRipple>
  );
});

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  main: { flex: 1, gap: 2 },
  top: { fontSize: font.caption, color: colors.textSubtle, fontVariant: ["tabular-nums"] },
  client: { fontSize: font.body + 1, fontWeight: "600", color: colors.text },
  address: { fontSize: font.small, color: colors.textMuted, lineHeight: 18 },
  side: { alignItems: "flex-end", gap: 2 },
  amount: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
}));
