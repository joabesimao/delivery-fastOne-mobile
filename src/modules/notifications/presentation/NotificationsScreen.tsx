import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { isAdmin, isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { confirm, Fab, GroupedItem, GroupSeparator } from "@/shared/layout";
import { describeError } from "@/shared/errors";
import { formatRelative } from "@/shared/format";
import { font, spacing } from "@/shared/theme";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Segmented,
  type IconName,
} from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import {
  appRouteForLink,
  isUnread,
  notificationIcons,
  type AppNotification,
} from "../domain/Notification";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useRemoveNotification,
  useUnreadCount,
} from "./hooks";

export function NotificationsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const notifications = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useRemoveNotification();
  const { role } = useSession();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unreadCount = unread.data ?? 0;

  const items = useMemo(() => {
    const all = notifications.data?.pages.flatMap((page) => page.items) ?? [];
    return onlyUnread ? all.filter(isUnread) : all;
  }, [notifications.data, onlyUnread]);

  const open = useCallback(
    (notification: AppNotification) => {
      if (isUnread(notification)) markRead.mutate(notification.id);
      const route = appRouteForLink(notification.link, isCourier(role));
      if (route) router.navigate(route);
    },
    [markRead, router, role],
  );

  const askRemove = useCallback(
    async (notification: AppNotification) => {
      if (await confirm("Excluir aviso?", notification.title)) remove.mutate(notification.id);
    },
    [remove],
  );

  if (notifications.isPending) return <LoadingState message="Carregando avisos..." />;
  if (notifications.isError) {
    return (
      <ErrorState message={describeError(notifications.error)} onRetry={notifications.refetch} />
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <GroupedItem index={index} count={items.length}>
            <NotificationRow notification={item} onPress={open} onLongPress={askRemove} />
          </GroupedItem>
        )}
        ItemSeparatorComponent={GroupSeparator}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
            void notifications.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={notifications.isRefetching && !notifications.isFetchingNextPage}
            onRefresh={() => {
              void notifications.refetch();
              void unread.refetch();
            }}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Segmented
              value={onlyUnread ? "unread" : "all"}
              onChange={(value) => setOnlyUnread(value === "unread")}
              options={[
                { value: "all", label: "Todos" },
                { value: "unread", label: "Não lidos", count: unreadCount || undefined },
              ]}
            />
            {unreadCount > 0 || items.length > 0 ? (
              <View style={styles.header}>
                <Text style={styles.hint}>Segure um aviso para excluir</Text>
                {unreadCount > 0 ? (
                  <Button
                    title="Marcar como lidos"
                    variant="ghost"
                    loading={markAll.isPending}
                    onPress={() => markAll.mutate()}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          notifications.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primary} />
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Nenhum aviso"
            description="Avisos da gestão e da frota aparecem aqui."
          />
        }
      />
      {isAdmin(role) ? (
        <Fab
          label="Enviar aviso"
          icon="megaphone-outline"
          onPress={() => router.push("/broadcast")}
        />
      ) : null}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
  onLongPress,
}: {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onLongPress: (notification: AppNotification) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const unread = isUnread(notification);
  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Não lido. " : ""}${notification.title}`}
      onPress={() => onPress(notification)}
      onLongPress={() => onLongPress(notification)}
      style={styles.row}
    >
      <>
        <View style={styles.marker}>{unread ? <View style={styles.dot} /> : null}</View>
        <Ionicons
          name={notificationIcons[notification.type] as IconName}
          size={20}
          color={unread ? colors.primary : colors.textSubtle}
          style={styles.icon}
        />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.time}>{formatRelative(notification.createdAt)}</Text>
          </View>
          <Text style={styles.body} numberOfLines={3}>
            {notification.body}
          </Text>
        </View>
      </>
    </TouchableRipple>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  headerBlock: { gap: spacing.xs, marginBottom: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  hint: { fontSize: font.caption, color: colors.textSubtle },
  footer: { marginVertical: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
  },
  // Coluna fina à esquerda: o ponto de não lido não empurra o conteúdo.
  marker: { width: spacing.md, alignItems: "flex-end", paddingTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  icon: { marginTop: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontSize: font.body, color: colors.textMuted, fontWeight: "500" },
  titleUnread: { color: colors.text, fontWeight: "600" },
  time: { fontSize: font.caption, color: colors.textSubtle },
  body: { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
}));
