import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { rangeKey, type DateRange, type RankingStatus } from "../domain/Reports";

const { reports } = container;

export const useDashboardReport = (range: DateRange) =>
  useQuery({
    queryKey: queryKeys.dashboardReport(rangeKey(range)),
    queryFn: ({ signal }) => reports.dashboard(range, signal),
    placeholderData: keepPreviousData,
  });

export const usePerformance = (range: DateRange) =>
  useQuery({
    queryKey: queryKeys.performance(rangeKey(range)),
    queryFn: ({ signal }) => reports.performance(range, signal),
    placeholderData: keepPreviousData,
  });

export const RANKING_PAGE_SIZE = 10;

export const useRanking = (range: DateRange, status: RankingStatus, page: number) =>
  useQuery({
    queryKey: [...queryKeys.ranking(rangeKey(range)), status, page],
    queryFn: ({ signal }) =>
      reports.ranking({ ...range, status, page, pageSize: RANKING_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });

// Exportação: percorre todas as páginas do ranking (100 por vez, o máximo da API).
export const fetchFullRanking = async (range: DateRange, status: RankingStatus) => {
  const items = [];
  for (let page = 1; ; page += 1) {
    const result = await reports.ranking({ ...range, status, page, pageSize: 100 });
    items.push(...result.items);
    if (page >= result.totalPages || result.items.length === 0) return items;
  }
};
