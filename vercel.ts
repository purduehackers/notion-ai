import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  bunVersion: "1.x",
  functions: {
    "src/index.ts": {
      maxDuration: 60,
    },
  },
  crons: [{ path: "/reindex", schedule: "0 * * * *" }],
};
