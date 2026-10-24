import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { isAdmin, isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { confirm, Fab } from "@/shared/layout";
import { Chip } from "@/shared/inputs";
import { describeError } from "@/shared/errors";
import { formatRelative } from "@/shared/format";
import { font, radius, spacing } from "@/shared/theme";
import { Button, EmptyState, ErrorState, LoadingState, type IconName } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
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
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={open} onLongPress={askRemove} />
        )}
        ItemSeparatorComponent={Separator}
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
            <View style={styles.filters}>
              <Chip label="Todos" selected={!onlyUnread} onPress={() => setOnlyUnread(false)} />
              <Chip label="Não lidos" selected={onlyUnread} onPress={() => setOnlyUnread(true)} />
            </View>
            {(unread.data ?? 0) > 0 ? (
              <View style={styles.header}>
                <Text style={styles.headerText}>{unread.data} não lido(s)</Text>
                <Button
                  title="Marcar todos como lidos"
                  variant="ghost"
                  icon="checkmark-done"
                  loading={markAll.isPending}
                  onPress={() => markAll.mutate()}
                />
              </View>
            ) : null}
            {items.length > 0 ? (
              <Text style={styles.hint}>Toque e segure um aviso para excluir.</Text>
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
            description="Avisos da gestão, do chat e da frota aparecem aqui."
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Não lido. " : ""}${notification.title}`}
      onPress={() => onPress(notification)}
      onLongPress={() => onLongPress(notification)}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons
          name={notificationIcons[notification.type] as IconName}
          size={20}
          color={colors.primary}
        />
      </View>
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
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  headerBlock: { gap: spacing.sm, marginBottom: spacing.md },
  filters: { flexDirection: "row", gap: spacing.sm },
  hint: { fontSize: font.caption, color: colors.textSubtle },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  footer: { marginVertical: spacing.lg },
  separator: { height: spacing.sm },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: "#C7D2FE", backgroundColor: "#FAFBFF" },
  pressed: { opacity: 0.85 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: "500" },
  titleUnread: { fontWeight: "700" },
  time: { fontSize: font.caption, color: colors.textSubtle },
  body: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
}));
