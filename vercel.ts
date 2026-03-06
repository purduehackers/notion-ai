import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  bunVersion: "1.x",
  crons: [{ path: "/reindex", schedule: "0 * * * *" }],
};
