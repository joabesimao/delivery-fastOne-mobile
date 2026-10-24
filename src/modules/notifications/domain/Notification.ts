export const NOTIFICATION_TYPES = [
  "chat_message",
  "oil_change_due",
  "oil_change_created",
  "fuel_refill_created",
  "admin_notice",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPage {
  items: AppNotification[];
  nextCursor: number | null;
}

export interface NotificationRepository {
  list(cursor: number | null, signal?: AbortSignal): Promise<NotificationPage>;
  unreadCount(signal?: AbortSignal): Promise<number>;
  markRead(id: number): Promise<void>;
  markAllRead(): Promise<void>;
}

export const isUnread = (notification: AppNotification) => notification.readAt === null;

export const notificationIcons: Record<NotificationType, string> = {
  chat_message: "chatbubble-ellipses-outline",
  oil_change_due: "warning-outline",
  oil_change_created: "construct-outline",
  fuel_refill_created: "speedometer-outline",
  admin_notice: "megaphone-outline",
};

// Os links do backend apontam para rotas do painel web; no app viram a aba equivalente.
export const appRouteForLink = (link: string | null): "/chat" | "/fleet" | null => {
  if (!link) return null;
  if (link.startsWith("/chat")) return "/chat";
  if (/troca-oleo|abastecimento|oil|fuel|frota/.test(link)) return "/fleet";
  return null;
};
