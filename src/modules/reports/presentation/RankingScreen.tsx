import { describeError } from "@/shared/errors";
import { shareCsv, toCsv } from "@/shared/exporters";
import { formatNumber, isoDay } from "@/shared/format";
import { Chip } from "@/shared/inputs";
import { ListRow, Screen } from "@/shared/layout";
import { spacing } from "@/shared/theme";
import { Banner, Button, EmptyState, LoadingState, SectionTitle } from "@/shared/ui";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { rankingStatusLabels, type RankingStatus } from "../domain/Reports";
import { fetchFullRanking, RANKING_PAGE_SIZE, useRanking } from "./hooks";
import { useDateRange } from "./RangePicker";

const STATUSES = Object.keys(rankingStatusLabels) as RankingStatus[];

// "Relatório de ranking de entregadores" do web, com exportação em CSV.
export function RankingScreen() {
  const { range, picker } = useDateRange(30);
  const [status, setStatus] = useState<RankingStatus>("all");
  // A página vale só para o filtro em que foi escolhida: mudou período ou status, volta à 1ª.
  const filterKey = `${status}|${range.start.getTime()}|${range.end.getTime()}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = (next: (current: number) => number) =>
    setPaging({ key: filterKey, page: next(page) });
  const [exporting, setExporting] = useState(false);
  const ranking = useRanking(range, status, page);
  const data = ranking.data;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const items = await fetchFullRanking(range, status);
      const csv = toCsv(
        ["posicao", "entregador", "total_entregas"],
        items.map((item, index) => [index + 1, item.name, item.total]),
      );
      await shareCsv(`ranking-entregadores-${isoDay(range.start)}-${isoDay(range.end)}.csv`, csv);
    } catch (error) {
      Alert.alert("Não foi possível exportar", describeError(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen refreshing={ranking.isRefetching} onRefresh={() => void ranking.refetch()}>
      {picker}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={rankingStatusLabels[s]}
            selected={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </ScrollView>

      {ranking.isError ? <Banner tone="error" message={describeError(ranking.error)} /> : null}
      {ranking.isLoading ? <LoadingState /> : null}

      {data ? (
        data.items.length === 0 ? (
          <EmptyState icon="trophy-outline" title="Nenhuma entrega no período" />
        ) : (
          <>
            <SectionTitle>{`${formatNumber(data.totalDeliveries)} entregas no período`}</SectionTitle>
            {data.items.map((item, index) => (
              <ListRow
                key={item.deliverymanId}
                icon={
                  (page - 1) * RANKING_PAGE_SIZE + index < 3 ? "trophy-outline" : "person-outline"
                }
                title={`${(page - 1) * RANKING_PAGE_SIZE + index + 1}º ${item.name}`}
                subtitle={`${formatNumber(item.total)} ${item.total === 1 ? "entrega" : "entregas"}`}
              />
            ))}
            {data.totalPages > 1 ? (
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Button
                  title="Anterior"
                  variant="secondary"
                  icon="chevron-back"
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || ranking.isFetching}
                  style={{ flex: 1 }}
                />
                <Button
                  title={`${page}/${data.totalPages}`}
                  variant="ghost"
                  onPress={() => undefined}
                  disabled
                />
                <Button
                  title="Próxima"
                  variant="secondary"
                  icon="chevron-forward"
                  onPress={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages || ranking.isFetching}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}
            <Button
              title="Exportar CSV"
              variant="secondary"
              icon="download-outline"
              onPress={() => void exportCsv()}
              loading={exporting}
            />
          </>
        )
      ) : null}
    </Screen>
  );
}
