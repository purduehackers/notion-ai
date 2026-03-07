import { AgentFS } from "agentfs-sdk";
import { createError, initLogger, parseError } from "evlog";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { runAgent, streamAgent } from "./agent";
import { env } from "./env";
import { CacheService } from "./services/cache";
import { RemoteDatabase } from "./services/database";
import { reindex, loadFiles } from "./services/filesystem";
import { createNotionService } from "./services/notion";

initLogger({
  env: { service: "notion-ai" },
  pretty: process.env.NODE_ENV === "development" ? true : false,
});

type DatabasePromise = Parameters<typeof AgentFS.openWith>[0];

const db = new RemoteDatabase(env.TURSO_DATABASE_URL, {
  authToken: env.TURSO_AUTH_TOKEN,
});
const agent = await AgentFS.openWith(db as unknown as DatabasePromise);

const notion = createNotionService(env.NOTION_API_TOKEN);
const cache = new CacheService(agent);

const app = new Hono<EvlogVariables>();

app.use(evlog());

app.onError((error, c) => {
  c.get("log").error(error);
  const parsed = parseError(error);
  return c.json(
    { message: parsed.message, why: parsed.why, fix: parsed.fix },
    (parsed.status || 500) as ContentfulStatusCode,
  );
});

app.get("/", (c) => {
  return c.text("ദ്ദി(｡•̀ ,<)~✩‧₊");
});

app.use("/sync", bearerAuth({ token: env.CRON_SECRET }));
app.use("/query", bearerAuth({ token: env.API_KEY }));
app.use("/query/stream", bearerAuth({ token: env.API_KEY }));

app.get("/sync", async (c) => {
  const log = c.get("log");
  log.set({ route: "reindex" });

  const stats = await reindex(notion, cache, log);
  log.set({ reindex: stats });

  return c.json(stats);
});

app.post("/query", async (c) => {
  const log = c.get("log");
  log.set({ route: "query" });

  const body = await c.req.json<{ prompt: string }>();
  if (!body.prompt) {
    throw createError({
      message: "Missing 'prompt' in request body",
      status: 400,
      why: "The request body must contain a 'prompt' field",
      fix: "Send a JSON body with a 'prompt' string field",
    });
  }

  log.set({ query: { promptLength: body.prompt.length } });

  const files = await loadFiles(cache, log);
  const result = await runAgent(body.prompt, files, log);

  log.set({ query: { resultLength: result.length } });

  return c.json({ result });
});

app.post("/query/stream", async (c) => {
  const log = c.get("log");
  log.set({ route: "query/stream" });

  const body = await c.req.json<{ prompt: string }>();
  if (!body.prompt) {
    throw createError({
      message: "Missing 'prompt' in request body",
      status: 400,
      why: "The request body must contain a 'prompt' field",
      fix: "Send a JSON body with a 'prompt' string field",
    });
  }

  log.set({ query: { promptLength: body.prompt.length } });

  const files = await loadFiles(cache, log);
  const result = await streamAgent(body.prompt, files, log);

  return result.toTextStreamResponse();
});

export default app;
