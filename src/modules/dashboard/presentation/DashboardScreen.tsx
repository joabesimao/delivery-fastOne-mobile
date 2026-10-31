import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { wholeDays } from "@/modules/reports/domain/Reports";
import { usePerformance, useRanking } from "@/modules/reports/presentation/hooks";
import { ColumnChart } from "@/shared/charts";
import { ListGroup, ListRow } from "@/shared/layout";
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
} from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
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
      {overview.isError ? <Banner tone="error" message={describeError(overview.error)} /> : null}

      <Segmented
        value={period}
        onChange={setPeriod}
        options={(Object.keys(periodLabels) as OverviewPeriod[]).map((value) => ({
          value,
          label: periodLabels[value],
        }))}
      />

      <View style={styles.summary}>
        <View style={styles.revenue}>
          <Text style={styles.metricLabel}>Receita entregue</Text>
          <Text style={styles.revenueValue} adjustsFontSizeToFit numberOfLines={1}>
            {formatCurrency(metrics.deliveredRevenue)}
          </Text>
          <Text
            style={[
              styles.trend,
              {
                color:
                  trend === null ? colors.textSubtle : trend >= 0 ? colors.success : colors.danger,
              },
            ]}
          >
            {trend === null
              ? "Sem período anterior para comparar"
              : `${trend >= 0 ? "+" : "−"}${formatNumber(Math.abs(trend) * 100, 0)}% em relação ao período anterior`}
          </Text>
        </View>
        <View style={styles.metrics}>
          <Metric
            label="Abertas"
            value={formatNumber(metrics.activeDeliveries)}
            onPress={() => router.navigate("/deliveries")}
          />
          <Metric label="Clientes" value={formatNumber(metrics.clients)} />
          <Metric label="Entregadores" value={formatNumber(metrics.deliverymen)} />
        </View>
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
          <ListGroup>
            {ranking.data.items.slice(0, 5).map((item, index) => (
              <ListRow
                key={item.deliverymanId}
                title={`${index + 1}º ${item.name}`}
                subtitle={`${formatNumber(item.total)} ${item.total === 1 ? "entrega" : "entregas"}`}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionTitle>Últimas entregas</SectionTitle>
      {latestDeliveries.length === 0 ? (
        <Text style={styles.muted}>Nenhuma entrega no período.</Text>
      ) : (
        <ListGroup>
          {latestDeliveries.map((delivery) => (
            <ListRow
              key={delivery.id}
              title={`#${delivery.id} · ${delivery.clientName}`}
              subtitle={`${delivery.deliverymanName} · ${formatCurrency(delivery.amount)}`}
              right={<StatusBadge status={delivery.status} />}
              onPress={() => router.push(`/delivery/${delivery.id}`)}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
}

function PerfStat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.perfValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// Número secundário do resumo; com onPress vira atalho para a tela correspondente.
function Metric({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const styles = useStyles();
  return (
    <TouchableRipple
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={styles.metric}
    >
      <>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </Text>
      </>
    </TouchableRipple>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  revenue: { padding: spacing.lg, gap: 2 },
  revenueValue: {
    fontSize: 30,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  trend: { fontSize: font.small, fontWeight: "500" },
  metrics: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  metric: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: 2,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    marginLeft: -1,
  },
  metricLabel: { fontSize: font.small, color: colors.textMuted },
  metricValue: {
    fontSize: font.title + 2,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  muted: { fontSize: font.small, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.md },
  chartCard: { gap: spacing.lg },
  perfStats: { flexDirection: "row", gap: spacing.md },
  perfValue: {
    fontSize: font.title,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
}));
