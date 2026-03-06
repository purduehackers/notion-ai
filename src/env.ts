import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NOTION_API_TOKEN: z.string().min(1),
    TURSO_DATABASE_URL: z.string().min(1),
    TURSO_AUTH_TOKEN: z.string().min(1).optional(),
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    API_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(16),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
