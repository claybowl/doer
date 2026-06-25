import { describe, it, expect } from "vitest";
import { mapNotionPageToBlogPost } from "../services/home-content.js";

describe("mapNotionPageToBlogPost", () => {
  it("maps a fully-populated Notion row across property types", () => {
    const post = mapNotionPageToBlogPost({
      id: "page-1",
      properties: {
        Title: { title: [{ plain_text: "Welcome to Doer" }] },
        Excerpt: { rich_text: [{ plain_text: "Get started fast." }] },
        Author: { people: [{ name: "Clay" }] },
        Date: { date: { start: "2026-06-20" } },
        Tag: { select: { name: "Getting Started" } },
        Featured: { checkbox: true },
        "Read time": { rich_text: [{ plain_text: "4 min read" }] },
      },
    });
    expect(post).toEqual({
      id: "page-1",
      title: "Welcome to Doer",
      excerpt: "Get started fast.",
      author: "Clay",
      date: "2026-06-20",
      readTime: "4 min read",
      featured: true,
      tag: "Getting Started",
    });
  });

  it("accepts column-name aliases (Name/Summary/Category)", () => {
    const post = mapNotionPageToBlogPost({
      id: "p2",
      properties: {
        Name: { title: [{ plain_text: "Aliased" }] },
        Summary: { rich_text: [{ plain_text: "via Summary" }] },
        Category: { select: { name: "Tutorial" } },
      },
    });
    expect(post.title).toBe("Aliased");
    expect(post.excerpt).toBe("via Summary");
    expect(post.tag).toBe("Tutorial");
  });

  it("applies sensible defaults when fields are missing", () => {
    const post = mapNotionPageToBlogPost({ id: "p3", properties: {} });
    expect(post.title).toBe("Untitled");
    expect(post.author).toBe("Doer Team");
    expect(post.tag).toBe("Update");
    expect(post.featured).toBe(false);
    expect(post.excerpt).toBe("");
  });

  it("treats a non-checked Featured property as not featured", () => {
    const post = mapNotionPageToBlogPost({
      id: "p4",
      properties: {
        Title: { title: [{ plain_text: "X" }] },
        Featured: { checkbox: false },
      },
    });
    expect(post.featured).toBe(false);
  });
});
