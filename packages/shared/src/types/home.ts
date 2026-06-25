export interface HomeBlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
  tag: string;
}

export interface HomeContentResponse {
  posts: HomeBlogPost[];
  /** "notion" when served from a configured Notion database, "default" otherwise. */
  source: "notion" | "default";
}
