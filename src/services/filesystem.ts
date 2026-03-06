import type { NotionFsClient, TreeNode } from "@rayhanadev/notion-fs";
import type { CacheService } from "./cache";

interface PageInfo {
  id: string;
  path: string;
  title: string;
}

const ROOT_DOCUMENTS: Record<string, string> = {
  Home: "282181f3b6ed80ef94cdcae7e3ccf865",
  Design: "282181f3b6ed801ab5b7c1bd370febac",
  Engineering: "282181f3b6ed80a287baf7a1945b72a7",
  Comms: "282181f3b6ed80c5b09fec1f8b2997ef",
  Finances: "282181f3b6ed80c8b694daa51b155b7d",
  Events: "282181f3b6ed800c8878ee011d80784a",
};

function sanitize(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[/\u0000]/g, "_").trim() || "Untitled";
}

function collectPages(node: TreeNode, parentPath: string): PageInfo[] {
  const name = sanitize(node.title);
  const path = `${parentPath}/${name}`;
  const pages: PageInfo[] = [{ id: node.id, path, title: node.title }];
  for (const child of node.children) {
    pages.push(...collectPages(child, path));
  }
  return pages;
}

async function fetchBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function reindex(
  client: NotionFsClient,
  cache: CacheService,
): Promise<{ fetched: number; cached: number; total: number }> {
  const trees = await Promise.all(
    Object.entries(ROOT_DOCUMENTS).map(async ([name, id]) => ({
      name,
      tree: await client.walk(id),
    })),
  );

  const allPages: PageInfo[] = [];
  for (const { name, tree } of trees) {
    allPages.push(...collectPages(tree, `/${name}`));
  }

  const stalePages: PageInfo[] = [];
  let cachedCount = 0;

  await fetchBatch(
    allPages,
    async (page) => {
      try {
        const meta = await client.stat(page.id);
        const cached = await cache.get(page.id);
        if (cached && cached.lastEditedTime === meta.lastEditedTime) {
          cachedCount++;
        } else {
          stalePages.push(page);
        }
      } catch {
        stalePages.push(page);
      }
    },
    10,
  );

  await fetchBatch(
    stalePages,
    async (page) => {
      try {
        const content = await client.read(page.id);
        const meta = await client.stat(page.id);
        await cache.set({
          id: page.id,
          path: page.path,
          title: page.title,
          content,
          lastEditedTime: meta.lastEditedTime,
          cachedAt: new Date().toISOString(),
        });
      } catch {
        // Skip pages that can't be read (databases, etc.)
      }
    },
    10,
  );

  return {
    fetched: stalePages.length,
    cached: cachedCount,
    total: allPages.length,
  };
}

export async function loadFiles(
  cache: CacheService,
): Promise<Record<string, string>> {
  const pages = await cache.getAll();
  const files: Record<string, string> = {};
  for (const page of pages) {
    files[`${page.path}.md`] = page.content;
  }
  return files;
}
