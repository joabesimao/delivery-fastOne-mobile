import { BarList, Donut } from "@/shared/charts";
import { describeError } from "@/shared/errors";
import { formatCurrency, formatNumber } from "@/shared/format";
import { Screen, StatCard, StatGrid } from "@/shared/layout";
import { Banner, Card, EmptyState, LoadingState, SectionTitle } from "@/shared/ui";
import { useDateRange } from "./RangePicker";
import { useDashboardReport } from "./hooks";

// "Relatórios do Dashboard" do web: totais, status, bairros e cidades do período.
export function DashboardReportScreen() {
  const { range, picker } = useDateRange(30);
  const report = useDashboardReport(range);
  const data = report.data;

  return (
    <Screen refreshing={report.isRefetching} onRefresh={() => void report.refetch()}>
      {picker}
      {report.isError ? <Banner tone="error" message={describeError(report.error)} /> : null}
      {report.isLoading ? <LoadingState /> : null}

      {data ? (
        <>
          <StatGrid>
            <StatCard icon="cube-outline" label="Pedidos" value={formatNumber(data.totalOrders)} />
            <StatCard
              icon="checkmark-done-outline"
              label="Finalizados"
              value={formatNumber(data.completedOrders)}
              tone="success"
            />
            <StatCard
              icon="time-outline"
              label="Pendentes"
              value={formatNumber(data.pendingOrders)}
              tone="warning"
            />
            <StatCard
              icon="cash-outline"
              label="Receita"
              value={formatCurrency(data.totalRevenue)}
            />
          </StatGrid>

          {data.totalOrders === 0 ? (
            <EmptyState
              icon="bar-chart-outline"
              title="Nenhuma entrega encontrada"
              description="Escolha outro período."
            />
          ) : (
            <>
              <SectionTitle>Status</SectionTitle>
              <Card>
                <Donut
                  data={[
                    { label: "Finalizadas", value: data.completedOrders },
                    { label: "Pendentes", value: data.pendingOrders },
                  ]}
                  format={formatNumber}
                />
              </Card>

              <SectionTitle>Entregas por bairro</SectionTitle>
              <Card>
                <BarList
                  data={data.byNeighborhood.map((d) => ({ label: d.name, value: d.value }))}
                />
              </Card>

              <SectionTitle>Entregas por cidade</SectionTitle>
              <Card>
                <BarList data={data.byCity.map((d) => ({ label: d.name, value: d.value }))} />
              </Card>
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}
