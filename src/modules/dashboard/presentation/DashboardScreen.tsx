import { firstName } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { StatusBadge } from "@/modules/deliveries/presentation/components";
import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatNumber } from "@/shared/format";
import { colors, font, radius, spacing } from "@/shared/theme";
import {
  Banner,
  Card,
  ErrorState,
  LoadingState,
  SectionTitle,
  Segmented,
  type IconName,
} from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { periodRange, revenueTrend, type OverviewPeriod } from "../domain/Overview";

const periodLabels: Record<OverviewPeriod, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

export function DashboardScreen() {
  const router = useRouter();
  const { name } = useSession();
  const [period, setPeriod] = useState<OverviewPeriod>("today");

  const overview = useQuery({
    queryKey: queryKeys.overview(period),
    queryFn: ({ signal }) => container.overview.load(periodRange(period), signal),
  });

  if (overview.isPending) return <LoadingState message="Carregando painel..." />;
  if (overview.isError && !overview.data) {
    return <ErrorState message={describeError(overview.error)} onRetry={overview.refetch} />;
  }

  const { metrics, latestDeliveries } = overview.data;
  const trend = revenueTrend(metrics);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={overview.isRefetching}
          onRefresh={() => void overview.refetch()}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.greeting}>Olá, {firstName(name)}</Text>
      {overview.isError ? <Banner tone="error" message={describeError(overview.error)} /> : null}

      <Segmented
        value={period}
        onChange={setPeriod}
        options={(Object.keys(periodLabels) as OverviewPeriod[]).map((value) => ({
          value,
          label: periodLabels[value],
        }))}
      />

      <View style={styles.grid}>
        <Kpi
          icon="cash-outline"
          label="Receita entregue"
          value={formatCurrency(metrics.deliveredRevenue)}
          detail={
            trend === null
              ? "sem base de comparação"
              : `${trend >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(trend) * 100, 0)}% vs. período anterior`
          }
          detailColor={
            trend === null ? colors.textSubtle : trend >= 0 ? colors.success : colors.danger
          }
          wide
        />
        <Kpi
          icon="bicycle-outline"
          label="Entregas abertas"
          value={formatNumber(metrics.activeDeliveries)}
          onPress={() => router.navigate("/deliveries")}
        />
        <Kpi icon="people-outline" label="Clientes" value={formatNumber(metrics.clients)} />
        <Kpi
          icon="id-card-outline"
          label="Entregadores"
          value={formatNumber(metrics.deliverymen)}
        />
      </View>

      <SectionTitle>Últimas entregas</SectionTitle>
      {latestDeliveries.length === 0 ? (
        <Text style={styles.muted}>Nenhuma entrega no período.</Text>
      ) : (
        <Card style={styles.latest}>
          {latestDeliveries.map((delivery, index) => (
            <Pressable
              key={delivery.id}
              accessibilityRole="button"
              onPress={() => router.push(`/delivery/${delivery.id}`)}
              style={({ pressed }) => [
                styles.latestRow,
                index > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.flex}>
                <Text style={styles.latestTitle} numberOfLines={1}>
                  #{delivery.id} · {delivery.clientName}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {delivery.deliverymanName} · {formatCurrency(delivery.amount)}
                </Text>
              </View>
              <StatusBadge status={delivery.status} />
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function Kpi({
  icon,
  label,
  value,
  detail,
  detailColor,
  wide,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  detail?: string;
  detailColor?: string;
  wide?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.kpi, wide && styles.kpiWide, pressed && styles.pressed]}
    >
      <View style={styles.kpiHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {detail ? <Text style={[styles.kpiDetail, { color: detailColor }]}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  greeting: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  kpiWide: { flexBasis: "100%" },
  kpiHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  kpiLabel: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  kpiValue: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  kpiDetail: { fontSize: font.caption, fontWeight: "600" },
  pressed: { opacity: 0.85 },
  muted: { fontSize: font.small, color: colors.textMuted },
  latest: { paddingVertical: spacing.xs },
  latestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  latestTitle: { fontSize: font.body, fontWeight: "600", color: colors.text },
});
