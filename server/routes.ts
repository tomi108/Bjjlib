import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import sharp from "sharp";

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.initializeDatabase();
  
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
      const sessionId = req.cookies.adminSessionId;
      
      if (!sessionId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const session = await storage.getAdminSession(sessionId);
      
      if (!session) {
        res.clearCookie('adminSessionId');
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      
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
      const sessionId = req.cookies.adminSessionId;
      
      if (!sessionId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const session = await storage.getAdminSession(sessionId);
      
      if (!session) {
        res.clearCookie('adminSessionId');
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      
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
      const sessionId = req.cookies.adminSessionId;
      
      if (!sessionId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const session = await storage.getAdminSession(sessionId);
      
      if (!session) {
        res.clearCookie('adminSessionId');
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      
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

  const thumbnailAnalysisCache = new Map<string, { leftBar: number; rightBar: number; totalPercent: number }>();

  app.get("/api/analyze-thumbnail", async (req, res) => {
    try {
      const thumbnailUrl = req.query.url as string;
      
      if (!thumbnailUrl) {
        return res.status(400).json({ message: "Missing url parameter" });
      }

      const allowedHosts = [
        'i.ytimg.com',
        'img.youtube.com',
        'i.vimeocdn.com',
        'vumbnail.com'
      ];

      let url: URL;
      try {
        url = new URL(thumbnailUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL" });
      }

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return res.status(400).json({ message: "Only HTTP/HTTPS URLs allowed" });
      }

      if (!allowedHosts.includes(url.hostname)) {
        return res.status(400).json({ message: "URL host not allowed" });
      }

      if (thumbnailAnalysisCache.has(thumbnailUrl)) {
        return res.json(thumbnailAnalysisCache.get(thumbnailUrl));
      }

      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        return res.status(404).json({ message: "Failed to fetch thumbnail" });
      }

      const buffer = await response.arrayBuffer();
      const image = sharp(Buffer.from(buffer));
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ message: "Invalid image" });
      }

      const scaleFactor = 0.25;
      const scaledWidth = Math.floor(metadata.width * scaleFactor);
      const scaledHeight = Math.floor(metadata.height * scaleFactor);

      const { data, info } = await image
        .resize(scaledWidth, scaledHeight)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const isPixelBlackOrGray = (x: number, y: number): boolean => {
        const channels = info.channels;
        const index = (y * info.width + x) * channels;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        const channelDiff = maxChannel - minChannel;
        const brightness = (r + g + b) / 3;
        
        const saturationRatio = channelDiff / Math.max(brightness, 1);
        
        return maxChannel < 50 && channelDiff < 10 && saturationRatio < 0.25;
      };

      const isColumnBlack = (x: number): boolean => {
        const sampleStep = 5;
        let blackPixels = 0;
        let totalSamples = 0;
        
        for (let y = 0; y < info.height; y += sampleStep) {
          if (isPixelBlackOrGray(x, y)) blackPixels++;
          totalSamples++;
        }
        
        return totalSamples >= 10 && blackPixels / totalSamples > 0.8;
      };

      let leftBarWidth = 0;
      for (let x = 0; x < info.width * 0.4; x++) {
        if (isColumnBlack(x)) {
          leftBarWidth = x + 1;
        } else {
          break;
        }
      }

      let rightBarWidth = 0;
      for (let x = info.width - 1; x > info.width * 0.6; x--) {
        if (isColumnBlack(x)) {
          rightBarWidth = info.width - x;
        } else {
          break;
        }
      }

      const leftBarPercent = (leftBarWidth / info.width) * 100;
      const rightBarPercent = (rightBarWidth / info.width) * 100;
      const totalBarPercent = leftBarPercent + rightBarPercent;

      const result = {
        leftBar: leftBarPercent,
        rightBar: rightBarPercent,
        totalPercent: totalBarPercent
      };

      thumbnailAnalysisCache.set(thumbnailUrl, result);

      res.json(result);
    } catch (error) {
      console.error("Error analyzing thumbnail:", error);
      res.status(500).json({ message: "Failed to analyze thumbnail" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
