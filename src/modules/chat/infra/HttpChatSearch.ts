import { AppError } from "@/core/errors/AppError";
import type { HttpClient } from "@/core/http/HttpClient";
import type { ChatSearchPage } from "../domain/ChatMessage";
import { parseSearchPage } from "./chatEvents";

// Busca no histórico pela API REST (o socket só entrega as mensagens recentes).
export class HttpChatSearch {
  constructor(private readonly http: HttpClient) {}

  async search(term: string, signal?: AbortSignal): Promise<ChatSearchPage> {
    const data = await this.http.request({
      method: "GET",
      path: "/chat/search",
      query: { q: term.trim(), limit: 50 },
      signal,
    });
    const page = parseSearchPage(data);
    if (!page) throw new AppError("invalid_response");
    return page;
  }
}
