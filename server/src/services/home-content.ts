import type { Db } from "@doerai/db";
import type { HomeBlogPost } from "@doerai/shared";
import { instanceSettingsService } from "./instance-settings.js";

const NOTION_VERSION = "2022-06-28";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { key: string; expires: number; posts: HomeBlogPost[] } | null = null;

type NotionProp = Record<string, unknown>;
type NotionPage = { id?: string; properties?: Record<string, NotionProp> };

/** Flatten any common Notion property type to a plain string. */
function plainText(prop: NotionProp | undefined): string {
  if (!prop) return "";
  const rich = (prop.title ?? prop.rich_text) as Array<{ plain_text?: string }> | undefined;
  if (Array.isArray(rich)) return rich.map((t) => t.plain_text ?? "").join("");
  if (prop.select && typeof prop.select === "object") return String((prop.select as { name?: string }).name ?? "");
  if (prop.date && typeof prop.date === "object") return String((prop.date as { start?: string }).start ?? "");
  if (Array.isArray(prop.people)) {
    return (prop.people as Array<{ name?: string }>).map((p) => p.name ?? "").filter(Boolean).join(", ");
  }
  if (typeof prop.email === "string") return prop.email;
  if (typeof prop.url === "string") return prop.url;
  return "";
}

/** Case-insensitive property lookup, trying several column-name aliases. */
function pick(props: Record<string, NotionProp>, ...names: string[]): NotionProp | undefined {
  for (const name of names) {
    const key = Object.keys(props).find((k) => k.toLowerCase() === name.toLowerCase());
    if (key) return props[key];
  }
  return undefined;
}

/** Map one Notion database row to a Home blog post. Exported for testing. */
export function mapNotionPageToBlogPost(page: NotionPage): HomeBlogPost {
  const props = page.properties ?? {};
  const featured = pick(props, "Featured", "Pinned");
  return {
    id: String(page.id ?? ""),
    title: plainText(pick(props, "Title", "Name")) || "Untitled",
    excerpt: plainText(pick(props, "Excerpt", "Summary", "Description")),
    author: plainText(pick(props, "Author", "By")) || "Doer Team",
    date: plainText(pick(props, "Date", "Published")),
    readTime: plainText(pick(props, "Read time", "ReadTime", "Read")),
    featured: Boolean(featured && (featured as { checkbox?: boolean }).checkbox === true),
    tag: plainText(pick(props, "Tag", "Category")) || "Update",
  };
}

export function homeContentService(db: Db) {
  const settings = instanceSettingsService(db);

  return {
    /**
     * Returns Notion-backed blog posts, or `null` when Notion isn't configured
     * or the fetch fails — callers fall back to the app's built-in defaults so
     * Home never breaks.
     */
    async blogPosts(): Promise<HomeBlogPost[] | null> {
      const general = await settings.getGeneral();
      const token = general.homeNotionToken?.trim();
      const dbId = general.homeNotionDatabaseId?.trim();
      if (!token || !dbId) return null;

      if (cache && cache.key === dbId && cache.expires > Date.now()) {
        return cache.posts;
      }

      try {
        const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 12 }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { results?: NotionPage[] };
        const posts = (data.results ?? [])
          .map(mapNotionPageToBlogPost)
          .filter((p) => p.title && p.title !== "Untitled");
        cache = { key: dbId, expires: Date.now() + CACHE_TTL_MS, posts };
        return posts;
      } catch {
        return null;
      }
    },
  };
}
