import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { fetchYouTubeDuration } from "./youtube";

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
      
      const duration = await fetchYouTubeDuration(validatedData.url);
      if (duration) {
        validatedData.duration = duration;
      }
      
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

  // Clear cache endpoint (for testing/debugging)
  app.post("/api/clear-thumbnail-cache", (_req, res) => {
    const size = thumbnailAnalysisCache.size;
    thumbnailAnalysisCache.clear();
    console.log(`[Cache] Cleared ${size} thumbnail analysis entries`);
    res.json({ message: `Cleared ${size} cached analyses` });
  });

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

      // Helper: Calculate RGB variance (std dev) for a column
      const calculateColumnVariance = (x: number): { variance: number; avgR: number; avgG: number; avgB: number } => {
        const channels = info.channels;
        const sampleStep = 5;
        const samples: { r: number; g: number; b: number }[] = [];
        
        for (let y = 0; y < info.height; y += sampleStep) {
          const index = (y * info.width + x) * channels;
          samples.push({
            r: data[index],
            g: data[index + 1],
            b: data[index + 2]
          });
        }
        
        if (samples.length < 10) {
          return { variance: 0, avgR: 0, avgG: 0, avgB: 0 };
        }
        
        // Calculate average RGB
        const avgR = samples.reduce((sum, s) => sum + s.r, 0) / samples.length;
        const avgG = samples.reduce((sum, s) => sum + s.g, 0) / samples.length;
        const avgB = samples.reduce((sum, s) => sum + s.b, 0) / samples.length;
        
        // Calculate RGB variance (average of channel variances)
        const varR = samples.reduce((sum, s) => sum + Math.pow(s.r - avgR, 2), 0) / samples.length;
        const varG = samples.reduce((sum, s) => sum + Math.pow(s.g - avgG, 2), 0) / samples.length;
        const varB = samples.reduce((sum, s) => sum + Math.pow(s.b - avgB, 2), 0) / samples.length;
        const variance = Math.sqrt((varR + varG + varB) / 3);
        
        return { variance, avgR, avgG, avgB };
      };
      
      // Calculate center region stats (middle 40%)
      const centerStart = Math.floor(info.width * 0.3);
      const centerEnd = Math.floor(info.width * 0.7);
      let centerVarianceSum = 0;
      let centerRSum = 0, centerGSum = 0, centerBSum = 0;
      let centerColumns = 0;
      
      for (let x = centerStart; x < centerEnd; x += 3) { // Sample every 3rd column for efficiency
        const stats = calculateColumnVariance(x);
        centerVarianceSum += stats.variance;
        centerRSum += stats.avgR;
        centerGSum += stats.avgG;
        centerBSum += stats.avgB;
        centerColumns++;
      }
      
      // Guard against division by zero for very narrow images
      if (centerColumns === 0) {
        return res.json({ leftBar: 0, rightBar: 0, totalPercent: 0 });
      }

      const centerAvgVariance = centerVarianceSum / centerColumns;
      const centerAvgR = centerRSum / centerColumns;
      const centerAvgG = centerGSum / centerColumns;
      const centerAvgB = centerBSum / centerColumns;
      
      // Helper: Check if column is a bar (uniform + different from center)
      const isColumnBar = (x: number): boolean => {
        const stats = calculateColumnVariance(x);
        
        // Column must be uniform (low variance)
        if (stats.variance >= 30) {
          return false;
        }
        
        // Calculate RGB distance from center
        const rgbDistance = Math.sqrt(
          Math.pow(stats.avgR - centerAvgR, 2) +
          Math.pow(stats.avgG - centerAvgG, 2) +
          Math.pow(stats.avgB - centerAvgB, 2)
        );
        
        // Column is bar if: uniform AND (differs from center OR center has detail)
        return rgbDistance > 35 || centerAvgVariance > 65;
      };

      // Measure left bar (outer 30% of width)
      let leftBarWidth = 0;
      const leftEdgeEnd = Math.floor(info.width * 0.3);
      for (let x = 0; x < leftEdgeEnd; x++) {
        if (isColumnBar(x)) {
          leftBarWidth = x + 1;
        } else {
          break;
        }
      }

      // Measure right bar (outer 30% of width)
      let rightBarWidth = 0;
      const rightEdgeStart = Math.floor(info.width * 0.7);
      for (let x = info.width - 1; x >= rightEdgeStart; x--) {
        if (isColumnBar(x)) {
          rightBarWidth = info.width - x;
        } else {
          break;
        }
      }

      let leftBarPercent = (leftBarWidth / info.width) * 100;
      let rightBarPercent = (rightBarWidth / info.width) * 100;
      const totalBarPercent = leftBarPercent + rightBarPercent;

      // Symmetry correction: if one side has significant bars (>25%) and the other is minimal (<5%),
      // mirror the bars to both sides (common for vertical videos cropped asymmetrically)
      let symmetryCorrected = false;
      if (leftBarPercent > 25 && rightBarPercent < 5) {
        rightBarPercent = leftBarPercent;
        symmetryCorrected = true;
      } else if (rightBarPercent > 25 && leftBarPercent < 5) {
        leftBarPercent = rightBarPercent;
        symmetryCorrected = true;
      }

      // Add 1.5% buffer crop to each side that has bars, only if total bars >5%
      const totalAfterSymmetry = leftBarPercent + rightBarPercent;
      if (totalAfterSymmetry > 5) {
        if (leftBarPercent > 0) leftBarPercent += 1.5;
        if (rightBarPercent > 0) rightBarPercent += 1.5;
      }

      const result = {
        leftBar: leftBarPercent,
        rightBar: rightBarPercent,
        totalPercent: leftBarPercent + rightBarPercent
      };

      // Log analysis details
      console.log(`[Thumbnail Analysis] URL: ${thumbnailUrl}`);
      console.log(`  Center variance: ${centerAvgVariance.toFixed(2)}, RGB: (${centerAvgR.toFixed(0)}, ${centerAvgG.toFixed(0)}, ${centerAvgB.toFixed(0)})`);
      if (symmetryCorrected) {
        console.log(`  Symmetry correction applied - mirrored bars to both sides`);
      }
      console.log(`  Detected bars - Left: ${leftBarPercent.toFixed(1)}%, Right: ${rightBarPercent.toFixed(1)}%, Total: ${result.totalPercent.toFixed(1)}%`);

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
