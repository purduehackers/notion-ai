import { Hono } from "hono";
import { Database } from "@tursodatabase/database";
import { AgentFS } from "agentfs-sdk";
import { env } from "./env.ts";
import { createNotionService } from "./services/notion.ts";
import { CacheService } from "./services/cache.ts";
import { buildFiles } from "./services/filesystem.ts";
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

app.post("/query", async (c) => {
	const body = await c.req.json<{ prompt: string }>();
	if (!body.prompt) {
		return c.json({ error: "Missing 'prompt' in request body" }, 400);
	}

	const files = await buildFiles(client, cache);
	const result = await runAgent(body.prompt, files);

	return c.json({ result });
});

export default app;
