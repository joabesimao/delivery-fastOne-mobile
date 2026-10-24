import type { AccountRole } from "@/modules/auth/domain/Session";

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
  remove(id: number): Promise<void>;
  // Aviso geral do admin; devolve quantas contas receberam.
  broadcast(input: BroadcastInput): Promise<number>;
}

export interface BroadcastInput {
  title: string;
  body: string;
  // Vazio = todos os perfis.
  roles: AccountRole[];
}

export const BROADCAST_TITLE_MAX = 191;
export const BROADCAST_BODY_MAX = 2000;

export const isUnread = (notification: AppNotification) => notification.readAt === null;

export const notificationIcons: Record<NotificationType, string> = {
  chat_message: "chatbubble-ellipses-outline",
  oil_change_due: "warning-outline",
  oil_change_created: "construct-outline",
  fuel_refill_created: "speedometer-outline",
  admin_notice: "megaphone-outline",
};

export type NotificationRoute = "/chat" | "/fleet" | "/fuel-refills" | "/oil-changes";

// Os links do backend apontam para rotas do painel web; no app viram a tela equivalente.
// O entregador vê a frota na aba dele; o gestor vai para a listagem de registros.
export const appRouteForLink = (
  link: string | null,
  courier: boolean,
): NotificationRoute | null => {
  if (!link) return null;
  if (link.startsWith("/chat")) return courier ? null : "/chat";
  const oil = /troca-oleo|oil/.test(link);
  const fuel = /abastecimento|fuel/.test(link);
  if (!oil && !fuel && !/frota/.test(link)) return null;
  if (courier) return "/fleet";
  return oil ? "/oil-changes" : "/fuel-refills";
};
