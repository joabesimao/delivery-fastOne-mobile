import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { firstName } from "@/modules/auth/domain/Session";
import { wholeDays } from "@/modules/reports/domain/Reports";
import { usePerformance, useRanking } from "@/modules/reports/presentation/hooks";
import { ColumnChart } from "@/shared/charts";
import { ListRow } from "@/shared/layout";
import { useSession } from "@/modules/auth/presentation/useSession";
import { StatusBadge } from "@/modules/deliveries/presentation/components";
import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatNumber } from "@/shared/format";
import { font, radius, spacing } from "@/shared/theme";
import {
  Banner,
  Button,
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
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { periodRange, revenueTrend, type OverviewPeriod } from "../domain/Overview";

const periodLabels: Record<OverviewPeriod, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

export function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { name } = useSession();
  const [period, setPeriod] = useState<OverviewPeriod>("today");

  const overview = useQuery({
    queryKey: queryKeys.overview(period),
    queryFn: ({ signal }) => container.overview.load(periodRange(period), signal),
  });

  // O gráfico de desempenho mostra pelo menos 7 dias, como no painel web.
  const range = periodRange(period === "today" ? "7d" : period);
  const chartRange = wholeDays(range.start, range.end);
  const performance = usePerformance(chartRange);
  const ranking = useRanking(wholeDays(periodRange(period).start, range.end), "all", 1);

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
          onRefresh={() => {
            void overview.refetch();
            void performance.refetch();
            void ranking.refetch();
          }}
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

      <View style={styles.actions}>
        <Button
          title="Nova entrega"
          icon="add-circle-outline"
          onPress={() => router.push("/new-delivery")}
          style={styles.flex}
        />
        <Button
          title="Relatórios"
          variant="secondary"
          icon="bar-chart-outline"
          onPress={() => router.push("/reports/overview")}
          style={styles.flex}
        />
      </View>

      {performance.data ? (
        <>
          <SectionTitle>Desempenho</SectionTitle>
          <Card style={styles.chartCard}>
            <View style={styles.perfStats}>
              <PerfStat label="Pedidos" value={formatNumber(performance.data.totalOrders)} />
              <PerfStat
                label="Tempo médio"
                value={
                  performance.data.avgDeliveryMinutes === null
                    ? "—"
                    : `${formatNumber(performance.data.avgDeliveryMinutes)} min`
                }
              />
              <PerfStat
                label="Pico"
                value={
                  performance.data.peakDay
                    ? `${performance.data.peakDay.label} (${performance.data.peakDay.total})`
                    : "—"
                }
              />
            </View>
            {performance.data.days.length > 0 ? (
              <ColumnChart
                data={performance.data.days.map((d) => ({
                  label: period === "30d" ? d.date.slice(8, 10) : d.label,
                  value: d.total,
                }))}
                format={(v) => `${v} ${v === 1 ? "pedido" : "pedidos"}`}
              />
            ) : (
              <Text style={styles.muted}>Sem pedidos no período.</Text>
            )}
          </Card>
        </>
      ) : null}

      {ranking.data && ranking.data.items.length > 0 ? (
        <>
          <SectionTitle
            action={
              <Button
                title="Ver ranking"
                variant="ghost"
                onPress={() => router.push("/reports/ranking")}
              />
            }
          >
            Top entregadores
          </SectionTitle>
          {ranking.data.items.slice(0, 5).map((item, index) => (
            <ListRow
              key={item.deliverymanId}
              icon={index === 0 ? "trophy-outline" : "person-outline"}
              title={`${index + 1}º ${item.name}`}
              subtitle={`${formatNumber(item.total)} ${item.total === 1 ? "entrega" : "entregas"}`}
            />
          ))}
        </>
      ) : null}

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

function PerfStat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.perfValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
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
  const styles = useStyles();
  const { colors } = useTheme();
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

const useStyles = makeStyles((colors) => ({
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
  actions: { flexDirection: "row", gap: spacing.md },
  chartCard: { gap: spacing.lg },
  perfStats: { flexDirection: "row", gap: spacing.md },
  perfValue: { fontSize: font.title, fontWeight: "800", color: colors.text, marginTop: 2 },
}));
