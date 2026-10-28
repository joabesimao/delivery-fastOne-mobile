import type { HttpClient } from "@/core/http/HttpClient";
import { parseResponse } from "@/core/http/parseResponse";
import { z } from "zod";
import {
  NOTIFICATION_TYPES,
  type BroadcastInput,
  type AppNotification,
  type NotificationPage,
  type NotificationRepository,
} from "../domain/Notification";

const PAGE_SIZE = 20;

export const notificationSchema = z.object({
  id: z.number(),
  // Tipos novos do backend não podem quebrar a lista inteira.
  type: z.enum(NOTIFICATION_TYPES).catch("admin_notice"),
  title: z.string(),
  body: z.string(),
  link: z.string().nullish(),
  readAt: z.string().nullish(),
  createdAt: z.string(),
});

const pageSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: z.number().nullish(),
});

export const toNotification = (dto: z.infer<typeof notificationSchema>): AppNotification => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  body: dto.body,
  link: dto.link ?? null,
  readAt: dto.readAt ? new Date(dto.readAt) : null,
  createdAt: new Date(dto.createdAt),
});

export class HttpNotificationRepository implements NotificationRepository {
  constructor(private readonly http: HttpClient) {}

  async list(cursor: number | null, signal?: AbortSignal): Promise<NotificationPage> {
    const data = await this.http.request({
      method: "GET",
      path: "/notifications",
      query: { cursor, limit: PAGE_SIZE },
      signal,
    });
    const page = parseResponse(pageSchema, data);
    return { items: page.items.map(toNotification), nextCursor: page.nextCursor ?? null };
  }

  async unreadCount(signal?: AbortSignal): Promise<number> {
    const data = await this.http.request({
      method: "GET",
      path: "/notifications/unread-count",
      signal,
    });
    return parseResponse(z.object({ unreadCount: z.number() }), data).unreadCount;
  }

  async markRead(id: number): Promise<void> {
    await this.http.request({ method: "PUT", path: `/notifications/${id}/read` });
  }

  async markAllRead(): Promise<void> {
    await this.http.request({ method: "PUT", path: "/notifications/read-all", body: {} });
  }

  async remove(id: number): Promise<void> {
    await this.http.request({ method: "DELETE", path: `/notifications/${id}` });
  }

  async broadcast({ title, body, roles }: BroadcastInput): Promise<number> {
    const data = await this.http.request({
      method: "POST",
      path: "/notifications/broadcast",
      body: { title: title.trim(), body: body.trim(), ...(roles.length > 0 && { roles }) },
    });
    return parseResponse(z.object({ recipients: z.number() }), data).recipients;
  }
}
