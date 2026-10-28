import { statusLabels } from "@/modules/deliveries/domain/Delivery";
import { useDeliveries } from "@/modules/deliveries/presentation/hooks";
import { BarList, Donut } from "@/shared/charts";
import { describeError } from "@/shared/errors";
import { shareCsv, toCsv } from "@/shared/exporters";
import { formatCurrency, formatDateTime, formatNumber, isoDay } from "@/shared/format";
import { ListRow, Screen, StatCard, StatGrid } from "@/shared/layout";
import { Banner, Button, Card, EmptyState, LoadingState, SectionTitle } from "@/shared/ui";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { buildDeliveriesReport, inRange } from "../domain/Reports";
import { useDateRange } from "./RangePicker";

// "Relatórios das Entregas" do web, calculado sobre a lista de pedidos.
export function DeliveriesReportScreen() {
  const { range, picker } = useDateRange(30);
  const deliveries = useDeliveries();
  const [exporting, setExporting] = useState(false);

  const scoped = useMemo(() => inRange(deliveries.data ?? [], range), [deliveries.data, range]);
  const report = useMemo(() => buildDeliveriesReport(scoped), [scoped]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = toCsv(
        [
          "pedido",
          "data",
          "status",
          "cliente",
          "bairro",
          "cidade",
          "entregador",
          "quantidade",
          "valor",
        ],
        scoped.map((d) => [
          d.id,
          formatDateTime(d.date),
          statusLabels[d.status],
          d.client.name,
          d.address.neighborhood,
          d.address.city,
          d.deliveryman?.name ?? "",
          d.quantity,
          d.amount.toFixed(2).replace(".", ","),
        ]),
      );
      await shareCsv(`entregas-${isoDay(range.start)}-${isoDay(range.end)}.csv`, csv);
    } catch (error) {
      Alert.alert(
        "Não foi possível exportar",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen refreshing={deliveries.isRefetching} onRefresh={() => void deliveries.refetch()}>
      {picker}
      {deliveries.isError ? (
        <Banner tone="error" message={describeError(deliveries.error)} />
      ) : null}
      {deliveries.isLoading ? <LoadingState /> : null}

      {deliveries.data ? (
        <>
          <StatGrid>
            <StatCard
              icon="cube-outline"
              label="Total de pedidos"
              value={formatNumber(report.totalOrders)}
            />
            <StatCard
              icon="checkmark-done-outline"
              label="Finalizados"
              value={formatNumber(report.finishedCount)}
              tone="success"
            />
            <StatCard
              icon="cash-outline"
              label="Receita total"
              value={formatCurrency(report.totalRevenue)}
            />
            <StatCard
              icon="pricetag-outline"
              label="Ticket médio"
              value={formatCurrency(report.averageTicket)}
              tone="warning"
            />
          </StatGrid>

          {report.totalOrders === 0 ? (
            <EmptyState icon="bar-chart-outline" title="Nenhuma entrega no período" />
          ) : (
            <>
              <SectionTitle>Por status</SectionTitle>
              <Card>
                <Donut
                  data={report.byStatus.map((s) => ({ label: s.name, value: s.value }))}
                  format={formatNumber}
                />
              </Card>

              <SectionTitle>Bairros com mais entregas</SectionTitle>
              <Card>
                <BarList
                  data={report.byNeighborhood.map((d) => ({ label: d.name, value: d.value }))}
                  limit={7}
                />
              </Card>

              <SectionTitle>Entregadores com mais pedidos</SectionTitle>
              {report.topDeliverymen.map((d, index) => (
                <ListRow
                  key={d.key}
                  icon="trophy-outline"
                  title={`${index + 1}º ${d.name}`}
                  subtitle={`${d.total} pedidos · ${d.finished} finalizados · ${d.open} em aberto`}
                  meta={`${formatCurrency(d.revenue)} · ${d.completionRate}% concluídos`}
                />
              ))}

              <Button
                title="Exportar CSV"
                variant="secondary"
                icon="download-outline"
                onPress={() => void exportCsv()}
                loading={exporting}
              />
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}
