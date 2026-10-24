import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { NotificationPage } from "../domain/Notification";

const repository = container.notifications;

export const useUnreadCount = () =>
  useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: ({ signal }) => repository.unreadCount(signal),
  });

export const useNotifications = () =>
  useInfiniteQuery({
    queryKey: queryKeys.notificationList,
    queryFn: ({ pageParam, signal }) => repository.list(pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

type NotificationPages = InfiniteData<NotificationPage, number | null>;

const markPagesRead = (data: NotificationPages | undefined, ids: number[] | "all") =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        (ids === "all" || ids.includes(item.id)) && !item.readAt
          ? { ...item, readAt: new Date() }
          : item,
      ),
    })),
  };

export const useMarkNotificationRead = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repository.markRead(id),
    onMutate: (id) => {
      client.setQueryData<NotificationPages>(queryKeys.notificationList, (data) =>
        markPagesRead(data, [id]),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => repository.markAllRead(),
    onMutate: () => {
      client.setQueryData<NotificationPages>(queryKeys.notificationList, (data) =>
        markPagesRead(data, "all"),
      );
      client.setQueryData(queryKeys.unreadCount, 0);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
};
