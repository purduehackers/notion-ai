# notion-ai

An AI agent that explores Purdue Hackers' Notion workspace. It indexes Notion pages into a virtual filesystem using [AgentFS](https://github.com/tursodatabase/agentfs) and [Turso](https://turso.tech)). After that it uses an agent with [just-bash](https://github.com/vercel-labs/just-bash) tools to navigate the filesystem.

Inspired by [this tweet](https://x.com/skeptrune/status/2029320646585684323) by [@skeptrune](https://x.com/skeptrune).

## Setup

```bash
bun install
```

Create a `.env.local` file with the following variables:

```
AI_GATEWAY_API_KEY=     # Vercel AI Gateway key (optional, for local dev)

NOTION_API_TOKEN=       # Notion integration token

TURSO_DATABASE_URL=     # Turso database URL
TURSO_AUTH_TOKEN=       # Turso auth token (optional for local)

API_KEY=                # Bearer token for the /query endpoint
CRON_SECRET=            # Bearer token for the /reindex endpoint (min 16 chars)
```

(Alternatively, just run `vercel env pull --yes` to fetch these from Vercel)

## Development

```bash
bun run dev
```

## API

### `POST /reindex`

Re-indexes the Notion workspace into the filesystem cache. Requires `Authorization: Bearer <CRON_SECRET>`.

### `POST /query`

Queries the AI agent about the Notion workspace. Requires `Authorization: Bearer <API_KEY>`.

```json
{ "prompt": "What is the process for cutting badges?" }
```

## Linting & Formatting

```bash
bun run lint
bun run format
bun run typecheck
```
