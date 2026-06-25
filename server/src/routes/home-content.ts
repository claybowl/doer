import { Router } from "express";
import type { Db } from "@doerai/db";
import type { HomeContentResponse } from "@doerai/shared";
import { homeContentService } from "../services/home-content.js";

export function homeContentRoutes(db: Db) {
  const router = Router();
  const svc = homeContentService(db);

  // Instance-level: the Home blog feed. Returns Notion-backed posts when
  // configured, otherwise an empty list with source "default" so the UI uses
  // its built-in content.
  router.get("/home-content", async (_req, res) => {
    const posts = await svc.blogPosts();
    const body: HomeContentResponse = posts
      ? { posts, source: "notion" }
      : { posts: [], source: "default" };
    res.json(body);
  });

  return router;
}
