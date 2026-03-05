import { createClient, type NotionFsClient } from "@rayhanadev/notion-fs";

export function createNotionService(token: string): NotionFsClient {
	return createClient({ token });
}
