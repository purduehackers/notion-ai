import type { AgentFS } from "agentfs-sdk";
import type { CachedPage } from "../types";

export class CacheService {
  constructor(private agent: AgentFS) {}

  async get(pageId: string): Promise<CachedPage | undefined> {
    return this.agent.kv.get<CachedPage>(`page:${pageId}`);
  }

  async set(page: CachedPage): Promise<void> {
    await this.agent.kv.set(`page:${page.id}`, page);
  }

  async getAll(): Promise<CachedPage[]> {
    const entries = await this.agent.kv.list("page:");
    return entries.map((e) => e.value as CachedPage);
  }
}
