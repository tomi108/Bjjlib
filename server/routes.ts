import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/api/videos", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const tagIdsParam = req.query.tagIds as string;
      const tagIds = tagIdsParam ? tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

      const result = await storage.getAllVideos({ page, limit, search, tagIds });
      res.json(result);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }

      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const validatedData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(validatedData);
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create video" });
      }
    }
  });

  app.put("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }

      const validatedData = insertVideoSchema.partial().parse(req.body);
      const video = await storage.updateVideo(id, validatedData);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update video" });
      }
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid video ID" });
      }

      const deleted = await storage.deleteVideo(id);
      if (!deleted) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  app.get("/api/tags", async (_req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/co-occurring", async (req, res) => {
    try {
      const tagIdsParam = req.query.tagIds as string;
      const selectedTagIds = tagIdsParam ? tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
      
      const tags = await storage.getCoOccurringTags(selectedTagIds);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching co-occurring tags:", error);
      res.status(500).json({ message: "Failed to fetch co-occurring tags" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const sessionId = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await storage.createAdminSession(sessionId, expiresAt);
      
      res.cookie('adminSessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt
      });
      
      res.json({ isAdmin: true });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    try {
      const sessionId = req.cookies.adminSessionId;
      
      if (sessionId) {
        await storage.deleteAdminSession(sessionId);
      }
      
      res.clearCookie('adminSessionId');
      res.json({ success: true });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to log out" });
    }
  });

  app.get("/api/admin/session", async (req, res) => {
    try {
      const sessionId = req.cookies.adminSessionId;
      
      if (!sessionId) {
        return res.json({ isAdmin: false });
      }
      
      const session = await storage.getAdminSession(sessionId);
      
      if (!session) {
        res.clearCookie('adminSessionId');
        return res.json({ isAdmin: false });
      }
      
      res.json({ isAdmin: true });
    } catch (error) {
      console.error("Error checking session:", error);
      res.status(500).json({ message: "Failed to check session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
