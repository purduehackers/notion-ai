import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [{ path: "/reindex", schedule: "0 * * * *" }],
};
