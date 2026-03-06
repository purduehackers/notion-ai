import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { Database } from "@tursodatabase/database";
import { AgentFS } from "agentfs-sdk";
import { env } from "./env.ts";
import { createNotionService } from "./services/notion.ts";
import { CacheService } from "./services/cache.ts";
import { reindex, loadFiles } from "./services/filesystem.ts";
import { runAgent } from "./agent.ts";

const tursoUrl = env.TURSO_AUTH_TOKEN
  ? `${env.TURSO_DATABASE_URL}?authToken=${env.TURSO_AUTH_TOKEN}`
  : env.TURSO_DATABASE_URL;
const db = new Database(tursoUrl);
await db.connect();

const agent = await AgentFS.openWith(db);
const client = createNotionService(env.NOTION_API_TOKEN);
const cache = new CacheService(agent);

const app = new Hono();

app.get("/", (c) => {
  return c.text("ദ്ദി(｡•̀ ,<)~✩‧₊");
});

app.use("/reindex", bearerAuth({ token: env.CRON_SECRET }));
app.use("/query", bearerAuth({ token: env.API_KEY }));

app.post("/reindex", async (c) => {
  const stats = await reindex(client, cache);
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
