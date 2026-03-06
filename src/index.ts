import { AgentFS } from "agentfs-sdk";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";

import { runAgent } from "./agent.ts";
import { env } from "./env.ts";
import { CacheService } from "./services/cache.ts";
import { RemoteDatabase } from "./services/database.ts";
import { reindex, loadFiles } from "./services/filesystem.ts";
import { createNotionService } from "./services/notion.ts";

type DatabasePromise = Parameters<typeof AgentFS.openWith>[0];

const db = new RemoteDatabase(env.TURSO_DATABASE_URL, {
  authToken: env.TURSO_AUTH_TOKEN,
});
const agent = await AgentFS.openWith(db as unknown as DatabasePromise);

const notion = createNotionService(env.NOTION_API_TOKEN);
const cache = new CacheService(agent);

const app = new Hono();

app.get("/", (c) => {
  return c.text("ദ്ദി(｡•̀ ,<)~✩‧₊");
});

app.use("/reindex", bearerAuth({ token: env.CRON_SECRET }));
app.use("/query", bearerAuth({ token: env.API_KEY }));

app.post("/reindex", async (c) => {
  const stats = await reindex(notion, cache);
  return c.json(stats);
});

app.post("/query", async (c) => {
  const body = await c.req.json<{ prompt: string }>();
  if (!body.prompt) {
    return c.json({ error: "Missing 'prompt' in request body" }, 400);
  }

  const files = await loadFiles(cache);
  const result = await runAgent(body.prompt, files);

  return c.json({ result });
});

export default app;
