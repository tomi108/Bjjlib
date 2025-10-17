# Bjjlib - Complete Technical Documentation for Grok

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema & Models](#4-database-schema--models)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Key Features & Implementation Details](#7-key-features--implementation-details)
8. [API Reference](#8-api-reference)
9. [Data Flow](#9-data-flow)
10. [File Structure](#10-file-structure)
11. [Development Workflow](#11-development-workflow)
12. [SEO Implementation](#12-seo-implementation)

---

## 1. Project Overview

**Bjjlib** is a full-stack BJJ (Brazilian Jiu-Jitsu) video library management application designed to organize, browse, and manage video content with advanced tagging capabilities.

### Purpose & Vision
- **Current (2025)**: Personal video library for BJJ training content
- **Future Vision**: White-label BJJ club management platform where clubs can manage private video libraries for members

### Target Keywords
- **Brand**: bjjlib, bjjlibrary
- **Current**: bjj training videos, bjj app
- **Future**: bjj club management, bjj gym app, bjj training platform

### Core Capabilities
✅ Video organization with intelligent tag filtering  
✅ Embedded video playback (YouTube, Vimeo)  
✅ Advanced thumbnail processing with black bar detection  
✅ Duration extraction without API keys (YouTube IFrame API)  
✅ Admin authentication for content management  
✅ Comprehensive SEO optimization with Schema.org markup  

---

## 2. Architecture Overview

### System Design Pattern: Monorepo with Shared Schemas

The application follows a **type-safe monorepo architecture** where frontend and backend share type definitions through the `/shared` directory.

```
┌─────────────────────────────────────────────────────┐
│              CLIENT (React + Vite)                  │
│  - Wouter routing (client-side)                     │
│  - TanStack Query (server state + caching)          │
│  - shadcn/ui components (Radix UI primitives)       │
│  - YouTube IFrame API (duration extraction)         │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST API
                     ↓
┌─────────────────────────────────────────────────────┐
│           SERVER (Express + TypeScript)             │
│  - RESTful API routes (/api/*)                      │
│  - Cookie-based admin authentication                │
│  - Request/response logging middleware              │
│  - Sharp.js image processing (thumbnail analysis)   │
│  - Dynamic sitemap generation                       │
└────────────────────┬────────────────────────────────┘
                     │ Drizzle ORM
                     ↓
┌─────────────────────────────────────────────────────┐
│       DATABASE (PostgreSQL / SQLite)                │
│  - Multi-database support (Postgres prod, SQLite dev)│
│  - Auto schema initialization                       │
│  - Relational data model (videos, tags, many-to-many)│
└─────────────────────────────────────────────────────┘
```

### Architecture Layers Explained

**1. Presentation Layer (Client)**
- React components with TypeScript
- State management via TanStack Query
- Form handling with react-hook-form + Zod
- UI primitives from Radix UI (headless, accessible)

**2. API Layer (Server)**
- Express.js REST endpoints
- Zod schema validation
- Cookie-based session management
- Middleware stack for logging and auth

**3. Data Access Layer (Storage)**
- Repository pattern (`IStorage` interface)
- Drizzle ORM for type-safe queries
- Support for both PostgreSQL and SQLite

**4. Database Layer**
- Relational schema (videos, tags, video_tags)
- Automatic migrations via Drizzle Kit
- Connection pooling for production

### Technology Choices & Rationale

| Technology | Why Chosen |
|-----------|-----------|
| **React + Vite** | Fast HMR, modern build tooling, excellent TypeScript support, lightweight vs Next.js |
| **Express** | Simple, proven, flexible for REST APIs, wide ecosystem |
| **PostgreSQL** | Production-ready ACID database, JSON support, full-text search capabilities |
| **SQLite** | Zero-config local development, same schema as Postgres via Drizzle |
| **Drizzle ORM** | Type-safe queries, automatic type inference, better performance than Prisma, schema-first design |
| **TanStack Query** | Powerful caching, automatic refetching, optimistic updates, built-in loading states |
| **shadcn/ui** | Composable primitives, full TypeScript support, accessible by default, copy-paste vs npm install |
| **Wouter** | Tiny router (1.6KB), hooks-based, perfect for SPAs |

---

## 3. Technology Stack

### Core Framework Stack

```json
{
  "frontend": {
    "framework": "React 18.3.1",
    "buildTool": "Vite 5.4.20",
    "language": "TypeScript 5.6.3",
    "routing": "wouter 3.3.5"
  },
  "backend": {
    "framework": "Express 4.21.2",
    "runtime": "Node.js (ES modules)",
    "language": "TypeScript 5.6.3",
    "devCompiler": "tsx 4.20.5",
    "prodCompiler": "esbuild 0.25.0"
  }
}
```

### Database & ORM Stack

```typescript
// Production Database
{
  database: "PostgreSQL (Neon serverless)",
  driver: "@neondatabase/serverless 0.10.4",
  features: ["Connection pooling", "Auto-scaling", "Serverless"]
}

// Development Database
{
  database: "SQLite",
  driver: "better-sqlite3 12.4.1",
  features: ["Zero config", "File-based", "Same schema as Postgres"]
}

// ORM & Validation
{
  orm: "drizzle-orm 0.39.1",
  migrations: "drizzle-kit 0.31.4",
  validation: "drizzle-zod 0.7.0",
  schema: "zod 3.24.2"
}
```

### State Management & Data Fetching

- **@tanstack/react-query 5.60.5**: Server state management
  - Automatic caching with configurable stale time
  - Background refetching
  - Optimistic updates
  - Query invalidation
  
- **react-hook-form 7.55.0**: Form state
  - Uncontrolled components for performance
  - Built-in validation
  - Error handling
  
- **zod 3.24.2**: Schema validation
  - Type inference
  - Runtime validation
  - Error messages

### UI Component Libraries

```typescript
// Primitive Components (Radix UI)
{
  core: [
    "@radix-ui/react-dialog",      // Modals
    "@radix-ui/react-dropdown-menu", // Dropdowns
    "@radix-ui/react-select",       // Select inputs
    "@radix-ui/react-tabs",         // Tab navigation
    "@radix-ui/react-toast",        // Notifications
    "@radix-ui/react-tooltip",      // Tooltips
    // ... 20+ more primitives
  ],
  icons: "lucide-react 0.453.0",
  commandMenu: "cmdk 1.1.1",
  carousel: "embla-carousel-react 8.6.0"
}

// Styling
{
  framework: "tailwindcss 3.4.17",
  variants: "class-variance-authority 0.7.1",
  utils: ["clsx 2.1.1", "tailwind-merge 2.6.0"],
  animations: "tailwindcss-animate 1.0.7"
}
```

### Authentication & Session Management

- **express-session 1.18.1**: Session middleware
- **cookie-parser 1.4.7**: Cookie parsing
- **passport 0.7.0 + passport-local 1.0.0**: Auth strategies (ready for expansion)
- **Custom admin sessions**: Database-backed cookie sessions

**Current Implementation:**
- Simple password-based admin login
- 30-day session expiry
- httpOnly cookies for security
- Session validation on all write operations

### Image Processing

- **sharp 0.34.4**: High-performance image processing
  - Thumbnail analysis for black bar detection
  - Pixel-level RGB extraction
  - Variance calculations
  - Memory-efficient streaming

**Use Cases:**
1. Analyze video thumbnails for black bars
2. Calculate pixel variance to detect content vs solid colors
3. Determine optimal crop positions

### Development Tools

```json
{
  "replitPlugins": [
    "@replit/vite-plugin-cartographer",      // Project navigation
    "@replit/vite-plugin-dev-banner",        // Dev mode indicator
    "@replit/vite-plugin-runtime-error-modal" // Error overlays
  ],
  "typeChecking": "TypeScript strict mode",
  "linting": "Built-in TypeScript checks",
  "formatting": "Prettier (via editor)"
}
```

---

## 4. Database Schema & Models

### Schema Architecture: Dual Database Support

The application uses a **dual schema pattern** to support both PostgreSQL (production) and SQLite (development) with the same codebase.

#### Core Schema File: `shared/schema.ts`

```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { pgTable, serial, text as pgText, timestamp, integer as pgInteger } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// SQLite Schemas (Development)
// ============================================

export const videosSqlite = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  duration: text("duration"),  // Format: "5:23" or "1:05:30"
  dateAdded: integer("date_added", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
});

export const tagsSqlite = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category")  // Hierarchical organization: guards, positions, submissions, etc.
});

export const videoTagsSqlite = sqliteTable("video_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: integer("video_id")
    .notNull()
    .references(() => videosSqlite.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tagsSqlite.id, { onDelete: "cascade" })
});

export const adminSessionsSqlite = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
});

// ============================================
// PostgreSQL Schemas (Production)
// ============================================

export const videosPg = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: pgText("title").notNull(),
  url: pgText("url").notNull(),
  duration: pgText("duration"),
  dateAdded: timestamp("date_added").notNull().defaultNow()
});

export const tagsPg = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull().unique(),
  category: pgText("category")  // Hierarchical organization: guards, positions, submissions, etc.
});

export const videoTagsPg = pgTable("video_tags", {
  id: serial("id").primaryKey(),
  videoId: pgInteger("video_id").notNull(),
  tagId: pgInteger("tag_id").notNull()
});

export const adminSessionsPg = pgTable("admin_sessions", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull()
});

// ============================================
// Active Schema (Runtime Selection)
// ============================================

// These are set at runtime based on DATABASE_URL
export let videos = videosSqlite;
export let tags = tagsSqlite;
export let videoTags = videoTagsSqlite;
export let adminSessions = adminSessionsSqlite;

// ============================================
// Zod Validation Schemas
// ============================================

export const insertVideoSchema = createInsertSchema(videosSqlite)
  .omit({ 
    id: true,        // Auto-generated
    dateAdded: true  // Auto-generated
  })
  .extend({ 
    tags: z.array(z.string()).optional() 
  });

export const insertTagSchema = createInsertSchema(tagsSqlite)
  .omit({ id: true });

export const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional()
});

// Predefined tag categories for organization
export const TAG_CATEGORIES = [
  "guards",      // Guard positions (closed guard, open guard, etc.)
  "positions",   // Positional control (mount, side control, etc.)
  "submissions", // Submission techniques (armbar, kimura, etc.)
  "sweeps",      // Sweep techniques
  "takedowns",   // Takedown techniques
  "escapes",     // Escape techniques
  "passes"       // Guard passing techniques
] as const;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// ============================================
// TypeScript Types (Auto-Inferred)
// ============================================

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type VideoTag = typeof videoTags.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;

// Composite type with joined data
export type VideoWithTags = Video & { tags: Tag[] };
```

### Database Relationships

```
videos (1) ──────< video_tags >────── (1) tags
  │                                       │
  │ Columns:                       Columns:│
  │ - id (PK)                      - id (PK)
  │ - title                        - name (UNIQUE)
  │ - url                          - category (nullable)
  │ - duration                            │
  │ - dateAdded                           │
  │                                       │
  └───────────────────────────────────────┘
          Many-to-Many Relationship
          
video_tags (join table):
- id (PK)
- videoId (FK → videos.id, CASCADE DELETE)
- tagId (FK → tags.id, CASCADE DELETE)
- UNIQUE(videoId, tagId)
```

### Schema Design Decisions

**1. Many-to-Many Tags**
- Videos can have multiple tags
- Tags can be on multiple videos
- Join table `video_tags` manages the relationship
- Cascade delete: removing a video removes all its tag links

**2. Text-Based Duration**
- Stored as "MM:SS" or "HH:MM:SS" strings
- Easy to display, no parsing needed
- Converted to ISO 8601 for Schema.org (e.g., "PT5M23S")

**3. Timestamp Handling**
- SQLite: Unix epoch integers
- PostgreSQL: Native timestamp type
- Drizzle automatically converts between them

**4. Session Storage**
- Sessions stored in database (not memory)
- Survives server restarts
- Can clean up expired sessions with queries

### Database Indexes (Performance)

```sql
-- Created during initialization (server/storage.ts)

-- Fast video lookup by tags
CREATE INDEX idx_video_tags_video_id ON video_tags(video_id);

-- Fast tag lookup for co-occurrence queries
CREATE INDEX idx_video_tags_tag_id ON video_tags(tag_id);

-- Purpose: Enable efficient JOIN operations and filtering
-- Impact: Sub-millisecond tag filtering even with 1000+ videos
```

### Sample Data Structure

```typescript
// Example video with tags
{
  id: 1,
  title: "Armbar from Mount",
  url: "https://youtube.com/watch?v=abc123",
  duration: "5:23",
  dateAdded: "2025-10-08T10:30:00.000Z",
  tags: [
    { id: 1, name: "armbar" },
    { id: 5, name: "mount" },
    { id: 12, name: "submissions" }
  ]
}

// Example tag with category
{
  id: 1,
  name: "armbar",
  category: "submissions"  // Can be null for uncategorized tags
}

// Example uncategorized tag
{
  id: 2,
  name: "fundamentals",
  category: null
}

// Example session
{
  id: "a1b2c3d4e5f6...",
  createdAt: "2025-10-08T08:00:00.000Z",
  expiresAt: "2025-11-07T08:00:00.000Z"
}
```

---

## 5. Backend Implementation

### Server Entry Point: `server/index.ts`

```typescript
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage";

const app = express();

// ============================================
// Middleware Stack
// ============================================

app.use(cookieParser());
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;  // Store raw body for webhook verification
  }
}));
app.use(express.urlencoded({ extended: false }));

// ============================================
// Request Logging Middleware
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  // Intercept res.json to capture response
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      // Truncate long logs
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// ============================================
// Dynamic Sitemap (before Vite middleware)
// ============================================

app.get("/sitemap.xml", async (_req, res) => {
  try {
    const result = await storage.getAllVideos({ page: 1, limit: 1000 });
    const videos = result.videos;

    const videoUrls = videos
      .map(video => {
        const lastmod = new Date(video.dateAdded).toISOString().split('T')[0];
        return `  <url>
    <loc>https://bjjlib.com/?video=${video.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bjjlib.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${videoUrls}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Failed to generate sitemap");
  }
});

// ============================================
// API Routes Registration
// ============================================

const server = await registerRoutes(app);

// ============================================
// Error Handling Middleware
// ============================================

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

// ============================================
// Vite Dev Server OR Static File Serving
// ============================================

if (app.get("env") === "development") {
  await setupVite(app, server);  // HMR + proxy
} else {
  serveStatic(app);  // Serve from dist/public
}

// ============================================
// Start Server
// ============================================

const port = parseInt(process.env.PORT || '5000', 10);
server.listen({
  port,
  host: "0.0.0.0",  // Required for Replit
  reusePort: true,
}, () => {
  console.log(`serving on port ${port}`);
});
```

### Storage Layer: `server/storage.ts`

**Repository Pattern Implementation**

```typescript
import { type Video, type InsertVideo, type Tag, type VideoWithTags, type AdminSession } from "@shared/schema";
import { db, isPostgres, videos, tags, videoTags, adminSessions } from "./db";
import { eq, sql, and, inArray, lt } from "drizzle-orm";

// ============================================
// Storage Interface (Contract)
// ============================================

export interface IStorage {
  // Video Operations
  getAllVideos(options?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    tagIds?: number[] 
  }): Promise<{ videos: VideoWithTags[]; total: number }>;
  
  getVideo(id: number): Promise<VideoWithTags | undefined>;
  createVideo(video: InsertVideo): Promise<VideoWithTags>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<VideoWithTags | undefined>;
  updateVideoDuration(id: number, duration: string): Promise<boolean>;
  deleteVideo(id: number): Promise<boolean>;
  
  // Tag Operations
  getAllTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createOrGetTag(name: string): Promise<Tag>;
  
  // Smart Tag Filtering
  getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]>;
  
  // Admin Session Operations
  createAdminSession(sessionId: string, expiresAt: Date): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Database Setup
  initializeDatabase(): Promise<void>;
}

// ============================================
// Database Storage Implementation
// ============================================

export class DbStorage implements IStorage {
  
  async initializeDatabase(): Promise<void> {
    // Create tables with CREATE TABLE IF NOT EXISTS
    // Add default tags: fundamentals, guard, submissions, sweeps, takedowns
    // Add indexes for performance
  }

  async getAllVideos(options?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    tagIds?: number[] 
  }): Promise<{ videos: VideoWithTags[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const search = options?.search?.toLowerCase();
    const tagIds = options?.tagIds || [];

    // Build query with filters
    let query = db.select().from(videos);
    
    // Search filter
    if (search) {
      query = query.where(sql`LOWER(${videos.title}) LIKE ${'%' + search + '%'}`);
    }

    // Tag filter (videos with ALL selected tags)
    if (tagIds.length > 0) {
      const videoIdsSubquery = db
        .select({ videoId: videoTags.videoId })
        .from(videoTags)
        .where(inArray(videoTags.tagId, tagIds))
        .groupBy(videoTags.videoId)
        .having(sql`COUNT(DISTINCT ${videoTags.tagId}) = ${tagIds.length}`);

      const videoIdsResults = isPostgres ? await videoIdsSubquery : videoIdsSubquery.all();
      const videoIds = dbAll(videoIdsResults).map((v: any) => v.videoId);
      
      if (videoIds.length === 0) {
        return { videos: [], total: 0 };
      }

      query = query.where(inArray(videos.id, videoIds));
    }

    // Execute query with ordering
    const queryWithOrder = query.orderBy(sql`${videos.dateAdded} DESC`);
    const allResults = isPostgres ? await queryWithOrder : queryWithOrder.all();
    const allResultsArray = dbAll(allResults);
    const total = allResultsArray.length;
    
    // Paginate
    const paginatedResults = allResultsArray.slice(offset, offset + limit);

    // Join tags for each video
    const videosWithTags: VideoWithTags[] = [];
    for (const video of paginatedResults) {
      const videoTagsQuery = db
        .select({ tagId: videoTags.tagId })
        .from(videoTags)
        .where(eq(videoTags.videoId, video.id));
      
      const videoTagsData = isPostgres ? await videoTagsQuery : videoTagsQuery.all();
      const tagIds = dbAll(videoTagsData).map((vt: any) => vt.tagId);
      
      let videoTagsList: Tag[] = [];
      if (tagIds.length > 0) {
        const tagsQuery = db
          .select()
          .from(tags)
          .where(inArray(tags.id, tagIds))
          .orderBy(tags.name);
        
        videoTagsList = isPostgres ? await tagsQuery : tagsQuery.all();
        videoTagsList = dbAll(videoTagsList);
      }

      videosWithTags.push({
        ...video,
        tags: videoTagsList,
      });
    }

    return { videos: videosWithTags, total };
  }

  // ============================================
  // SMART TAG FILTERING (Key Feature)
  // ============================================

  async getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]> {
    if (selectedTagIds.length === 0) {
      return this.getAllTags();
    }

    // Step 1: Find videos that have ALL selected tags
    const videoIdsQuery = db
      .select({ videoId: videoTags.videoId })
      .from(videoTags)
      .where(inArray(videoTags.tagId, selectedTagIds))
      .groupBy(videoTags.videoId)
      .having(sql`COUNT(DISTINCT ${videoTags.tagId}) = ${selectedTagIds.length}`);
    
    const videoIdsResults = isPostgres ? await videoIdsQuery : videoIdsQuery.all();
    const videoIdsWithAllTags = dbAll(videoIdsResults).map((v: any) => v.videoId);

    if (videoIdsWithAllTags.length === 0) {
      return [];
    }

    const totalFilteredVideos = videoIdsWithAllTags.length;

    // Step 2: Count how many filtered videos have each tag
    const tagCountsQuery = db
      .select({ 
        tagId: videoTags.tagId,
        count: sql<number>`COUNT(DISTINCT ${videoTags.videoId})`.as('count')
      })
      .from(videoTags)
      .where(inArray(videoTags.videoId, videoIdsWithAllTags))
      .groupBy(videoTags.tagId);
    
    const tagCountsResults = isPostgres ? await tagCountsQuery : tagCountsQuery.all();
    const tagCounts = dbAll(tagCountsResults);

    // Step 3: Filter to "useful" tags
    // Exclude: tags on ALL videos (universal), already selected tags
    const usefulTagIds = tagCounts
      .filter((tc: any) => 
        tc.count < totalFilteredVideos &&      // Not on all videos
        !selectedTagIds.includes(tc.tagId)     // Not already selected
      )
      .map((tc: any) => tc.tagId);

    if (usefulTagIds.length === 0) {
      return [];
    }

    // Step 4: Return tag objects
    const tagsQuery = db
      .select()
      .from(tags)
      .where(inArray(tags.id, usefulTagIds))
      .orderBy(tags.name);
    
    const result = isPostgres ? await tagsQuery : tagsQuery.all();
    return dbAll(result);
  }

  // ... other methods (createVideo, updateVideo, etc.)
}

// ============================================
// Export Singleton Instance
// ============================================

export const storage = new DbStorage();
```

**Key Algorithm: Smart Tag Filtering**

Example scenario:
```
Videos in library:
1. "Armbar A" - tags: [armbar, mount, submissions]
2. "Armbar B" - tags: [armbar, guard, submissions]
3. "Kimura C" - tags: [kimura, guard, submissions]

User selects "armbar":
- Filtered videos: [1, 2]
- Tag counts: armbar=2, mount=1, guard=1, submissions=2
- Exclude: armbar (selected), submissions (universal - on all 2 videos)
- Show: mount (1/2), guard (1/2)
```

### API Routes: `server/routes.ts`

```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import sharp from "sharp";

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.initializeDatabase();
  
  // ============================================
  // Health Check
  // ============================================
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // ============================================
  // Videos API
  // ============================================

  app.get("/api/videos", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const tagIdsParam = req.query.tagIds as string;
      const tagIds = tagIdsParam 
        ? tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) 
        : [];

      const result = await storage.getAllVideos({ page, limit, search, tagIds });
      res.json(result);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.post("/api/videos", async (req, res) => {
    try {
      // Auth check
      const sessionId = req.cookies.adminSessionId;
      if (!sessionId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const session = await storage.getAdminSession(sessionId);
      if (!session) {
        res.clearCookie('adminSessionId');
        return res.status(401).json({ message: "Invalid or expired session" });
      }
      
      // Validate input
      const validatedData = insertVideoSchema.parse(req.body);
      
      // Create video
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

  app.patch("/api/videos/:id/duration", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { duration } = req.body;
      
      const updated = await storage.updateVideoDuration(id, duration);
      if (!updated) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update duration" });
    }
  });

  // ============================================
  // Tags API
  // ============================================

  app.get("/api/co-occurring-tags", async (req, res) => {
    try {
      const tagIdsParam = req.query.tagIds as string;
      const tagIds = tagIdsParam 
        ? tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) 
        : [];
      
      const coOccurringTags = await storage.getCoOccurringTags(tagIds);
      res.json(coOccurringTags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch co-occurring tags" });
    }
  });

  // ============================================
  // Thumbnail Analysis API
  // ============================================

  app.get("/api/analyze-thumbnail", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ message: "URL parameter required" });
      }

      // Fetch image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(404).json({ message: "Failed to fetch thumbnail" });
      }

      // Process with Sharp
      const buffer = await sharp(await response.arrayBuffer())
        .resize(80, 45)  // Downsample for performance
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data, info } = buffer;
      const width = info.width;
      const height = info.height;
      
      // Calculate center column variance
      const centerX = Math.floor(width / 2);
      let centerVariance = 0;
      let centerR = 0, centerG = 0, centerB = 0;
      
      for (let y = 0; y < height; y++) {
        const idx = (y * width + centerX) * 3;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        centerR += r;
        centerG += g;
        centerB += b;
      }
      
      centerR /= height;
      centerG /= height;
      centerB /= height;
      
      for (let y = 0; y < height; y++) {
        const idx = (y * width + centerX) * 3;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        centerVariance += Math.pow(r - centerR, 2) + Math.pow(g - centerG, 2) + Math.pow(b - centerB, 2);
      }
      
      centerVariance = Math.sqrt(centerVariance / height);
      
      // Detect bars from edges
      function detectBarFromEdge(startX: number, direction: 1 | -1): number {
        let barPixels = 0;
        for (let x = startX; x >= 0 && x < width; x += direction) {
          let columnVariance = 0;
          let avgR = 0, avgG = 0, avgB = 0;
          
          for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 3;
            avgR += data[idx];
            avgG += data[idx + 1];
            avgB += data[idx + 2];
          }
          
          avgR /= height;
          avgG /= height;
          avgB /= height;
          
          for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 3;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            columnVariance += Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2);
          }
          
          columnVariance = Math.sqrt(columnVariance / height);
          
          if (columnVariance > centerVariance * 0.6) break;
          barPixels++;
        }
        
        return (barPixels / width) * 100;
      }
      
      const leftBar = detectBarFromEdge(0, 1);
      const rightBar = detectBarFromEdge(width - 1, -1);
      
      console.log(`[Thumbnail Analysis] URL: ${imageUrl}`);
      console.log(`  Center variance: ${centerVariance.toFixed(2)}, RGB: (${Math.round(centerR)}, ${Math.round(centerG)}, ${Math.round(centerB)})`);
      console.log(`  Detected bars - Left: ${leftBar.toFixed(1)}%, Right: ${rightBar.toFixed(1)}%, Total: ${(leftBar + rightBar).toFixed(1)}%`);
      
      res.json({
        leftBar,
        rightBar,
        totalBar: leftBar + rightBar,
        centerVariance
      });
    } catch (error) {
      console.error("Error analyzing thumbnail:", error);
      res.status(500).json({ message: "Failed to analyze thumbnail" });
    }
  });

  // ============================================
  // Admin API
  // ============================================

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
      
      if (password === correctPassword) {
        const sessionId = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await storage.createAdminSession(sessionId, expiresAt);
        
        res.cookie('adminSessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
        
        res.json({ success: true, isAdmin: true });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/admin/session", async (req, res) => {
    const sessionId = req.cookies.adminSessionId;
    
    if (!sessionId) {
      return res.json({ isAdmin: false });
    }
    
    const session = await storage.getAdminSession(sessionId);
    
    if (!session || new Date() > new Date(session.expiresAt)) {
      res.clearCookie('adminSessionId');
      return res.json({ isAdmin: false });
    }
    
    res.json({ isAdmin: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
```

---

## 6. Frontend Implementation

### Application Entry: `client/src/App.tsx`

```typescript
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import EditVideo from "@/pages/edit-video";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/edit/:id" component={EditVideo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### Query Client Setup: `client/src/lib/queryClient.ts`

```typescript
import { QueryClient } from "@tanstack/react-query";

// Default fetch with error handling
async function throwIfError(res: Response) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// Global query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);
        return throwIfError(res);
      },
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Helper for mutations
export async function apiRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return throwIfError(res);
}
```

### Home Page: `client/src/pages/home.tsx` (Simplified)

```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, AlertCircle } from "lucide-react";
import { 
  SchemaMarkup, 
  generateOrganizationSchema, 
  generateSoftwareApplicationSchema,
  generateItemListSchema,
  generateVideoObjectSchema 
} from "@/components/schema-markup";
import { youtubeDurationReader, formatDuration } from "@/lib/youtube-duration";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VideoWithTags, Tag } from "@shared/schema";

export default function Home() {
  // Auth state
  const { data: authData } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/session'],
  });
  const isAdmin = authData?.isAdmin || false;

  // Tag filtering state
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const selectedTagIds = selectedTags.map(t => t.id);

  // All tags
  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ['/api/tags'],
  });

  // Filtered videos
  const { data: videosData, isLoading } = useQuery<{ 
    videos: VideoWithTags[]; 
    total: number 
  }>({
    queryKey: ['/api/videos', { tagIds: selectedTagIds.join(',') }],
  });

  // Co-occurring tags (smart filtering)
  const { data: coOccurringTags } = useQuery<Tag[]>({
    queryKey: ['/api/co-occurring-tags', { tagIds: selectedTagIds.join(',') }],
    enabled: selectedTagIds.length > 0,
  });

  const availableTags = selectedTagIds.length > 0 
    ? coOccurringTags || [] 
    : allTags || [];

  // Duration extraction
  const [videoDurations, setVideoDurations] = useState<Record<number, string>>({});
  
  useEffect(() => {
    if (!videosData?.videos) return;
    
    videosData.videos.forEach(async (video) => {
      // Use cached duration if available
      if (video.duration) {
        setVideoDurations(prev => ({ ...prev, [video.id]: video.duration! }));
        return;
      }
      
      // Extract YouTube ID
      const youtubeMatch = video.url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
      const videoId = youtubeMatch ? youtubeMatch[1] : null;
      
      if (videoId) {
        const duration = await youtubeDurationReader.getDuration(videoId);
        if (duration) {
          const formatted = formatDuration(duration);
          setVideoDurations(prev => ({ ...prev, [video.id]: formatted }));
          
          // Persist to database
          await apiRequest(`/api/videos/${video.id}/duration`, {
            method: 'PATCH',
            body: JSON.stringify({ duration: formatted }),
          });
          
          // Invalidate query to update cache
          queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
        }
      }
    });
  }, [videosData]);

  // Thumbnail black bar detection
  const detectAndCropBlackBars = async (img: HTMLImageElement, title: string) => {
    try {
      const analysis = await fetch(
        `/api/analyze-thumbnail?url=${encodeURIComponent(img.src)}`
      ).then(r => r.json());
      
      const { leftBar, rightBar, totalBar } = analysis;
      
      // Dynamic zoom based on bar severity
      let zoom = 1;
      if (totalBar > 50) {
        zoom = 1.18;  // Severe bars
      } else if (totalBar > 5) {
        zoom = 1.12;  // Moderate bars
      }
      
      img.style.transform = `scale(${zoom})`;
      
      // Offset for asymmetric bars
      const offset = (leftBar - rightBar) * 0.5;
      img.style.objectPosition = `${50 + offset}% center`;
    } catch (error) {
      console.error("Thumbnail analysis failed:", error);
    }
  };

  return (
    <>
      {/* SEO Schema Injection */}
      <SchemaMarkup schema={generateOrganizationSchema()} />
      <SchemaMarkup schema={generateSoftwareApplicationSchema()} />
      <SchemaMarkup schema={generateItemListSchema(videosData?.videos || [])} />
      
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="border-b border-gray-800">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-4xl font-bold">Bjjlib</h1>
          </div>
        </header>

        {/* Tag Selection Interface */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-semibold mb-6">Quick tag search</h2>
          
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Selected tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => setSelectedTags(prev => prev.filter(t => t.id !== tag.id))}
                  >
                    {tag.name} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Tags */}
          <div>
            <h3 className="text-lg font-medium mb-3">Available tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-600"
                  onClick={() => setSelectedTags(prev => [...prev, tag])}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Video Grid */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videosData?.videos.map(video => {
              const embedUrl = getEmbedUrl(video.url);
              const thumbnailUrl = getThumbnailUrl(video.url);
              const hasValidSchema = embedUrl && (
                video.url.includes('youtube.com') || 
                video.url.includes('youtu.be') || 
                video.url.includes('vimeo.com')
              );
              
              return (
                <Card key={video.id} className="bg-gray-900 border-gray-800">
                  {/* VideoObject schema only for supported platforms */}
                  {hasValidSchema && (
                    <SchemaMarkup schema={generateVideoObjectSchema({
                      id: video.id,
                      title: video.title,
                      url: video.url,
                      duration: videoDurations[video.id] || video.duration,
                      dateAdded: typeof video.dateAdded === 'string' 
                        ? video.dateAdded 
                        : video.dateAdded.toISOString(),
                      tags: video.tags
                    })} />
                  )}
                  
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {embedUrl && thumbnailUrl ? (
                      <>
                        <img
                          src={thumbnailUrl}
                          alt={`BJJ technique video: ${video.title}${
                            video.tags.length > 0 
                              ? ` - ${video.tags.map(t => t.name).join(', ')}` 
                              : ''
                          }`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onLoad={(e) => detectAndCropBlackBars(e.currentTarget, video.title)}
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,...'; // Fallback
                          }}
                        />
                        
                        {/* Duration Overlay */}
                        {videoDurations[video.id] && (
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded">
                            {videoDurations[video.id]}
                          </div>
                        )}
                        
                        {/* Play Button */}
                        <button
                          onClick={() => playVideoFullscreen(embedUrl)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-16 h-16 text-white" fill="white" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-800">
                        <AlertCircle className="w-8 h-8 text-gray-600" />
                        <p className="text-sm text-gray-400">Cannot embed this video</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-semibold mb-2">{video.title}</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.tags.map(tag => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

// Helper functions
function getEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
  
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  
  return null;
}

function getThumbnailUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  
  return null;
}

function playVideoFullscreen(embedUrl: string) {
  // Create fullscreen overlay with iframe
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:black;z-index:9999;';
  
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:rgba(0,0,0,0.7);color:white;border:none;width:40px;height:40px;border-radius:50%;';
  closeBtn.onclick = () => document.body.removeChild(div);
  
  div.appendChild(iframe);
  div.appendChild(closeBtn);
  document.body.appendChild(div);
}
```

---

## 7. Key Features & Implementation Details

### 7.1 YouTube Duration Extraction (No API Key)

**File:** `client/src/lib/youtube-duration.ts`

**Problem:** YouTube Data API has strict quotas and requires API keys

**Solution:** YouTube IFrame Player API with hidden 1x1px players

```typescript
interface YT {
  Player: {
    new (elementId: string, options: any): YTPlayer;
  };
}

interface YTPlayer {
  cueVideoById(videoId: string): void;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

class YouTubeDurationReader {
  private apiReady = false;
  private apiLoading = false;
  private apiFailed = false;
  private queue: DurationRequest[] = [];
  private processing = false;

  constructor() {
    this.loadAPI();
  }

  private loadAPI(): void {
    if (window.YT && window.YT.Player) {
      this.apiReady = true;
      return;
    }

    if (this.apiLoading) return;
    this.apiLoading = true;

    window.onYouTubeIframeAPIReady = () => {
      this.apiReady = true;
      this.apiLoading = false;
      this.processQueue();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      this.apiFailed = true;
      this.failAllQueued();
    };
    
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }

  private async readDuration(videoId: string): Promise<number | null> {
    return new Promise((resolve) => {
      if (!this.apiReady || !window.YT) {
        resolve(null);
        return;
      }

      // Create hidden container
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;opacity:0;';
      container.id = `yt-duration-reader-${Date.now()}`;
      document.body.appendChild(container);

      let player: YTPlayer | null = null;
      let timeoutId: number;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (player) player.destroy();
        if (container.parentNode) container.parentNode.removeChild(container);
      };

      timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 10000); // 10 second timeout

      try {
        player = new window.YT!.Player(container.id, {
          height: '1',
          width: '1',
          videoId: videoId,
          events: {
            onReady: (event: any) => {
              const duration = event.target.getDuration();
              cleanup();
              resolve(duration > 0 ? duration : null);
            },
            onError: () => {
              cleanup();
              resolve(null);
            },
          },
        });
      } catch (e) {
        cleanup();
        resolve(null);
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.apiReady) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      const duration = await this.readDuration(request.videoId);
      request.resolve(duration);

      // Small delay to avoid overwhelming browser
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  public getDuration(videoId: string): Promise<number | null> {
    return new Promise((resolve) => {
      if (this.apiFailed) {
        resolve(null);
        return;
      }

      this.queue.push({ videoId, resolve });

      if (this.apiReady) {
        this.processQueue();
      }
    });
  }
}

export const youtubeDurationReader = new YouTubeDurationReader();

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

**How It Works:**
1. Load YouTube IFrame API script once on page load
2. Queue video IDs for duration extraction
3. For each video: create hidden 1x1px iframe
4. Use `player.getDuration()` to get metadata (no playback)
5. Destroy player and remove iframe immediately
6. Cache result in state and persist to database
7. Subsequent page loads: fetch from database (instant)

**Benefits:**
- ✅ No API key required
- ✅ No quota limits
- ✅ Works client-side
- ✅ Automatic caching

### 7.2 Dynamic Thumbnail Processing

**Challenge:** YouTube thumbnails often have black bars (letterboxing/pillarboxing)

**Solution:** Server-side variance analysis + client-side CSS transforms

**Server-side Analysis** (`/api/analyze-thumbnail`):
```typescript
// 1. Fetch thumbnail and downsample
const buffer = await sharp(imageBuffer)
  .resize(80, 45)  // Fast analysis
  .raw()
  .toBuffer({ resolveWithObject: true });

// 2. Calculate center column variance (content detection)
const centerX = Math.floor(width / 2);
let centerVariance = 0;
let avgR = 0, avgG = 0, avgB = 0;

for (let y = 0; y < height; y++) {
  const idx = (y * width + centerX) * 3;
  avgR += data[idx];
  avgG += data[idx + 1];
  avgB += data[idx + 2];
}

avgR /= height;
avgG /= height;
avgB /= height;

for (let y = 0; y < height; y++) {
  const idx = (y * width + centerX) * 3;
  centerVariance += Math.pow(data[idx] - avgR, 2) 
                  + Math.pow(data[idx + 1] - avgG, 2) 
                  + Math.pow(data[idx + 2] - avgB, 2);
}

centerVariance = Math.sqrt(centerVariance / height);

// 3. Scan from edges until variance increases
function detectBarFromEdge(startX: number, direction: 1 | -1): number {
  let barPixels = 0;
  for (let x = startX; x >= 0 && x < width; x += direction) {
    let columnVariance = calculateColumnVariance(data, x, height);
    
    // If variance > 60% of center, we've hit content
    if (columnVariance > centerVariance * 0.6) break;
    barPixels++;
  }
  return (barPixels / width) * 100;
}

const leftBar = detectBarFromEdge(0, 1);
const rightBar = detectBarFromEdge(width - 1, -1);

// Response: { leftBar: 15.5, rightBar: 4.2, totalBar: 19.7 }
```

**Client-side Cropping** (`home.tsx`):
```typescript
const detectAndCropBlackBars = async (img: HTMLImageElement) => {
  const analysis = await fetch(`/api/analyze-thumbnail?url=${img.src}`)
    .then(r => r.json());
  
  const { leftBar, rightBar, totalBar } = analysis;
  
  // Dynamic zoom based on severity
  let zoom = 1;
  if (totalBar > 50) {
    zoom = 1.18;  // Severe bars (>50%)
  } else if (totalBar > 5) {
    zoom = 1.12;  // Moderate bars (5-50%)
  }
  // else: no zoom for minimal bars (<5%)
  
  img.style.transform = `scale(${zoom})`;
  
  // Shift position for asymmetric bars
  const offset = (leftBar - rightBar) * 0.5;
  img.style.objectPosition = `${50 + offset}% center`;
};
```

**Result:** Thumbnails dynamically crop bars without distortion

### 7.3 Admin Authentication

**Implementation:** Cookie-based sessions with database storage

**Login Flow:**
```typescript
// POST /api/admin/login
if (password === process.env.ADMIN_PASSWORD) {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await storage.createAdminSession(sessionId, expiresAt);
  
  res.cookie('adminSessionId', sessionId, {
    httpOnly: true,              // Prevent XSS
    secure: NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',             // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  
  res.json({ success: true, isAdmin: true });
}
```

**Session Validation (all write operations):**
```typescript
const sessionId = req.cookies.adminSessionId;
if (!sessionId) return res.status(401).json({ message: "Auth required" });

const session = await storage.getAdminSession(sessionId);
if (!session || new Date() > session.expiresAt) {
  res.clearCookie('adminSessionId');
  return res.status(401).json({ message: "Session expired" });
}

// Proceed with operation
```

**Frontend Auth Check:**
```typescript
const { data: authData } = useQuery({
  queryKey: ['/api/admin/session'],
});
const isAdmin = authData?.isAdmin || false;

{isAdmin && <AdminPanel />}
```

### 7.4 Hierarchical Tag Management

**Purpose:** Organize tags into predefined categories for better UX and improved content discovery.

**Implementation:** Tags can be assigned to categories (guards, positions, submissions, etc.) or remain uncategorized.

**Tag Categories** (`shared/schema.ts`):
```typescript
export const TAG_CATEGORIES = [
  "guards",      // Guard positions (closed guard, open guard, etc.)
  "positions",   // Positional control (mount, side control, etc.)
  "submissions", // Submission techniques (armbar, kimura, etc.)
  "sweeps",      // Sweep techniques
  "takedowns",   // Takedown techniques
  "escapes",     // Escape techniques
  "passes"       // Guard passing techniques
] as const;

export type TagCategory = typeof TAG_CATEGORIES[number] | null;
```

**Database Schema:**
```typescript
// Tags table includes nullable category field
export const tagsSqlite = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category")  // Nullable for uncategorized tags
});
```

**Safe Migration (Zero Data Loss):**
```typescript
// PostgreSQL - safe column addition
await db.execute(sql`
  ALTER TABLE tags 
  ADD COLUMN IF NOT EXISTS category TEXT
`);

// SQLite - safe column addition with try-catch
try {
  await db.run(sql`ALTER TABLE tags ADD COLUMN category TEXT`);
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) {
    console.error("Failed to add category column:", e.message);
  }
}
```

**Storage Layer** (`server/storage.ts`):
```typescript
// Get tags by category
async getTagsByCategory(category: string | null): Promise<Tag[]> {
  const tagsQuery = db
    .selectDistinct({ id: tags.id, name: tags.name, category: tags.category })
    .from(tags)
    .innerJoin(videoTags, eq(tags.id, videoTags.tagId))
    .where(category === null ? sql`${tags.category} IS NULL` : eq(tags.category, category))
    .orderBy(tags.name);
  
  return dbAll(isPostgres ? await tagsQuery : tagsQuery.all());
}

// Update tag (rename and/or change category)
async updateTag(id: number, updates: UpdateTag): Promise<Tag | undefined> {
  const result = dbGet(await db.update(tags)
    .set(updates)
    .where(eq(tags.id, id))
    .returning());
  return result;
}

// Rename tag (updates all associated videos)
async renameTag(id: number, newName: string): Promise<Tag | undefined> {
  const normalizedName = newName.toLowerCase().trim();
  const result = dbGet(await db.update(tags)
    .set({ name: normalizedName })
    .where(eq(tags.id, id))
    .returning());
  return result;
}
```

**API Routes** (`server/routes.ts`):
```typescript
// Get tags by category
app.get("/api/tags/by-category", async (req, res) => {
  const category = req.query.category as string | undefined;
  const categoryValue = category === 'null' || category === undefined ? null : category;
  
  const tags = await storage.getTagsByCategory(categoryValue);
  res.json(tags);
});

// Update tag (admin only)
app.put("/api/admin/tags/:id", async (req, res) => {
  // Auth check
  const sessionId = req.cookies.adminSessionId;
  if (!sessionId) return res.status(401).json({ message: "Authentication required" });
  
  const session = await storage.getAdminSession(sessionId);
  if (!session) {
    res.clearCookie('adminSessionId');
    return res.status(401).json({ message: "Invalid or expired session" });
  }
  
  const id = parseInt(req.params.id);
  const validatedData = updateTagSchema.parse(req.body);
  const tag = await storage.updateTag(id, validatedData);
  
  if (!tag) return res.status(404).json({ message: "Tag not found" });
  res.json(tag);
});
```

**Admin UI** (`client/src/components/admin-tab.tsx`):
```typescript
function TagManagerCard({ allTags }: { allTags: Tag[] }) {
  // Group tags by category
  const groupedTags = allTags.reduce((acc, tag) => {
    const category = tag.category || "uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Sort categories in predefined order
  const categoryOrder = [...TAG_CATEGORIES, "uncategorized"];
  const sortedCategories = categoryOrder.filter(cat => groupedTags[cat]?.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Manager ({allTags.length} tags)</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedCategories.map(category => (
          <div key={category}>
            <h3>{category}</h3>
            {groupedTags[category].map(tag => (
              <div key={tag.id}>
                <Badge>{tag.name}</Badge>
                {/* Quick category change dropdown */}
                <Select
                  value={tag.category || "uncategorized"}
                  onValueChange={(value) => updateTagCategory(tag.id, value)}
                >
                  {TAG_CATEGORIES.map(cat => (
                    <SelectItem value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="uncategorized">uncategorized</SelectItem>
                </Select>
                {/* Edit and delete buttons */}
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Frontend Display** (`client/src/pages/home.tsx`):
```typescript
// Group available tags by category
const groupedTags = availableTags.reduce((acc, tag) => {
  const category = tag.category || "uncategorized";
  if (!acc[category]) acc[category] = [];
  acc[category].push(tag);
  return acc;
}, {} as Record<string, Tag[]>);

// Display tags in category sections
{sortedCategories.map(category => (
  <div key={category}>
    <h3 className="text-blue-400 uppercase">
      {category === "uncategorized" ? "Available tags" : category}
    </h3>
    <div className="flex flex-wrap gap-2">
      {groupedTags[category].map(tag => (
        <button onClick={() => toggleTag(tag.id)}>
          {tag.name}
        </button>
      ))}
    </div>
  </div>
))}
```

**Benefits:**
1. **Better Organization:** Tags grouped by technique type improve browsability
2. **Improved UX:** Users can find relevant tags faster when organized by category
3. **Flexible:** Tags can remain uncategorized, categories can be changed
4. **Safe Migration:** Existing data preserved via nullable category column
5. **Admin Control:** Full tag management (rename, categorize, delete) via admin UI

**Migration Safety Notes:**
- Uses `ALTER TABLE ADD COLUMN IF NOT EXISTS` (PostgreSQL)
- Try-catch pattern for SQLite (checks for "duplicate column" error)
- All existing tags default to `category = null` (uncategorized)
- Zero data loss - all tag names and video associations preserved
- Column is nullable, so no NOT NULL constraint issues

---

## 8. API Reference

### Videos API

#### `GET /api/videos`
Retrieve videos with pagination, search, and tag filtering.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Results per page
- `search` (string): Case-insensitive title search
- `tagIds` (string): Comma-separated tag IDs (e.g., "1,5,9")

**Response:**
```json
{
  "videos": [
    {
      "id": 1,
      "title": "Armbar from Mount",
      "url": "https://youtube.com/watch?v=abc123",
      "duration": "5:23",
      "dateAdded": "2025-10-08T10:30:00.000Z",
      "tags": [
        { "id": 1, "name": "armbar" },
        { "id": 5, "name": "mount" }
      ]
    }
  ],
  "total": 42
}
```

#### `GET /api/videos/:id`
Get single video by ID.

**Response:** Single `VideoWithTags` object

#### `POST /api/videos`
Create new video (requires admin auth).

**Request Body:**
```json
{
  "title": "Triangle Choke Setup",
  "url": "https://youtube.com/watch?v=xyz",
  "tags": ["triangle", "guard", "submissions"]
}
```

**Response:** Created `VideoWithTags` object

#### `PUT /api/videos/:id`
Update video (requires admin auth).

**Request Body:** Partial video object

#### `PATCH /api/videos/:id/duration`
Update only the duration field (no auth required - system operation).

**Request Body:**
```json
{
  "duration": "7:45"
}
```

#### `DELETE /api/videos/:id`
Delete video (requires admin auth).

**Response:** 204 No Content

### Tags API

#### `GET /api/tags`
Get all tags that have videos.

**Response:**
```json
[
  { "id": 1, "name": "armbar" },
  { "id": 2, "name": "triangle" }
]
```

#### `GET /api/co-occurring-tags`
Get smart filtered tags based on selected tags.

**Query Parameters:**
- `tagIds` (string): Comma-separated selected tag IDs

**Response:** Array of tags that:
- Appear on SOME (not all) filtered videos
- Are not already selected

#### `POST /api/tags`
Create tag (requires admin auth).

**Request Body:**
```json
{
  "name": "kimura"
}
```

#### `DELETE /api/tags/:id`
Delete tag (requires admin auth).

### Admin API

#### `POST /api/admin/login`
Create admin session.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "isAdmin": true
}
```

**Sets Cookie:** `adminSessionId` (httpOnly, 30 days)

#### `GET /api/admin/session`
Check auth status.

**Response:**
```json
{
  "isAdmin": true
}
```

#### `POST /api/admin/logout`
Delete session and clear cookie.

**Response:** 204 No Content

### Utility API

#### `GET /api/analyze-thumbnail`
Analyze thumbnail for black bars.

**Query Parameters:**
- `url` (string): Image URL

**Response:**
```json
{
  "leftBar": 15.5,
  "rightBar": 4.2,
  "totalBar": 19.7,
  "centerVariance": 60.3
}
```

#### `GET /sitemap.xml`
Dynamic XML sitemap with all videos.

**Response:** XML document

#### `GET /api/health`
Server health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

---

## 9. Data Flow

### Video Creation Flow

```
┌─────────────────────────────────────────────┐
│  1. CLIENT: User fills video form           │
│     - Title: "Armbar from Mount"            │
│     - URL: "https://youtube.com/..."        │
│     - Tags: ["armbar", "mount"]             │
└─────────────────┬───────────────────────────┘
                  │ POST /api/videos
                  ↓
┌─────────────────────────────────────────────┐
│  2. SERVER: routes.ts                       │
│     ✓ Check adminSessionId cookie          │
│     ✓ Validate session in database          │
│     ✓ Parse body with insertVideoSchema    │
└─────────────────┬───────────────────────────┘
                  │ storage.createVideo(data)
                  ↓
┌─────────────────────────────────────────────┐
│  3. STORAGE: storage.ts                     │
│     1. Insert video record                  │
│     2. For each tag:                        │
│        a. createOrGetTag("armbar")          │
│        b. Insert video_tags link            │
│     3. Fetch and return video with tags     │
└─────────────────┬───────────────────────────┘
                  │ SQL queries
                  ↓
┌─────────────────────────────────────────────┐
│  4. DATABASE: PostgreSQL/SQLite             │
│     BEGIN TRANSACTION:                      │
│     - INSERT INTO videos VALUES (...)       │
│     - INSERT INTO tags ... ON CONFLICT ...  │
│     - INSERT INTO video_tags VALUES (...)   │
│     COMMIT                                  │
└─────────────────┬───────────────────────────┘
                  │ Return result
                  ↓
┌─────────────────────────────────────────────┐
│  5. RESPONSE to client                      │
│     { id: 43, title: "...", tags: [...] }  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  6. CLIENT: TanStack Query                  │
│     1. Invalidate cache:                    │
│        - ['/api/videos']                    │
│        - ['/api/tags']                      │
│     2. Trigger automatic refetch            │
│     3. UI updates with new video            │
└─────────────────────────────────────────────┘
```

### Tag Filtering Flow

```
User clicks "armbar" tag
       │
       ↓
┌─────────────────────────────────────────────┐
│  1. React State Update                      │
│     selectedTags: [{ id: 1, name: "armbar" }]│
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  2. TanStack Query Auto-Triggers            │
│     GET /api/videos?tagIds=1                │
│     GET /api/co-occurring-tags?tagIds=1     │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  3. Storage: getAllVideos({ tagIds: [1] })  │
│     SQL:                                    │
│     SELECT * FROM videos                    │
│     WHERE id IN (                           │
│       SELECT video_id FROM video_tags       │
│       WHERE tag_id = 1                      │
│     )                                       │
│     → Returns 2 videos                      │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  4. Storage: getCoOccurringTags([1])        │
│     Step 1: Get videos with tag 1           │
│       → [video_1, video_2]                  │
│     Step 2: Count tags on those videos      │
│       armbar: 2, mount: 1, guard: 1, etc.   │
│     Step 3: Filter useful tags              │
│       - Exclude tag 1 (selected)            │
│       - Exclude tags on ALL videos          │
│     → Returns ["mount", "guard", "kimura"]  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  5. UI Updates                              │
│     - Show 2 filtered videos                │
│     - Available tags: mount, guard, kimura  │
│     - User can refine search further        │
└─────────────────────────────────────────────┘
```

### Duration Extraction Flow

```
Page loads with YouTube videos
       │
       ↓
┌─────────────────────────────────────────────┐
│  1. useEffect in home.tsx                   │
│     For each video:                         │
│     - Check if video.duration exists        │
│     - If yes: use cached value              │
│     - If no: extract YouTube ID             │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  2. youtubeDurationReader.getDuration(id)   │
│     1. Add to queue                         │
│     2. Create hidden 1x1px iframe:          │
│        <div style="position:absolute;       │
│                    left:-9999px;">          │
│          <iframe id="yt-player-xxx">        │
│        </div>                               │
│     3. Wait for onReady event               │
│     4. Call player.getDuration()            │
│     5. Destroy player & remove iframe       │
│     6. Return duration in seconds           │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  3. Format & Display                        │
│     formatDuration(342) → "5:42"            │
│     setVideoDurations({ ...prev, [id]: ... })│
│     → UI shows duration overlay             │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  4. Persist to Database                     │
│     PATCH /api/videos/1/duration            │
│     { duration: "5:42" }                    │
│     → Saved in database                     │
│     → Next page load: instant from DB       │
└─────────────────────────────────────────────┘
```

---

## 10. File Structure

```
bjjlib/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   └── ... (20+ components)
│   │   │   ├── admin-tab.tsx       # Admin login/video add panel
│   │   │   ├── schema-markup.tsx   # SEO structured data injection
│   │   │   ├── tag-autosuggest.tsx # Tag input with autocomplete
│   │   │   ├── tag-manager.tsx     # Tag CRUD UI
│   │   │   ├── video-card.tsx      # Individual video display
│   │   │   ├── video-form.tsx      # Video add/edit form
│   │   │   └── video-table.tsx     # Admin video table
│   │   ├── lib/
│   │   │   ├── queryClient.ts      # TanStack Query config
│   │   │   └── youtube-duration.ts # Duration extraction logic
│   │   ├── pages/
│   │   │   ├── home.tsx            # Main video library page
│   │   │   ├── edit-video.tsx      # Video editing page
│   │   │   └── not-found.tsx       # 404 page
│   │   ├── App.tsx                 # Root component + routing
│   │   ├── main.tsx                # Entry point (ReactDOM.render)
│   │   └── index.css               # Global styles + Tailwind
│   └── index.html                  # HTML shell with SEO meta tags
│
├── server/                          # Backend (Express + TypeScript)
│   ├── db.ts                       # Database connection & config
│   ├── index.ts                    # Express app entry + sitemap
│   ├── routes.ts                   # API route handlers
│   ├── storage.ts                  # Data access layer (IStorage)
│   └── vite.ts                     # Vite dev server integration
│
├── shared/                          # Shared types & schemas
│   └── schema.ts                   # Drizzle schemas + Zod validation
│
├── drizzle.config.ts               # Drizzle ORM configuration
├── vite.config.ts                  # Vite build configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript compiler options
├── package.json                    # Dependencies & scripts
├── replit.md                       # Project documentation
└── GROK_TECHNICAL_DOCUMENTATION.md # This file
```

### Key Files Explained

**`client/src/App.tsx`**
- Root React component
- Sets up Wouter routing
- Wraps app in QueryClientProvider

**`client/src/lib/queryClient.ts`**
- Configures TanStack Query
- Default fetch implementation
- Global query settings (stale time, refetch behavior)

**`client/src/lib/youtube-duration.ts`**
- YouTube IFrame Player API wrapper
- Queue-based duration extraction
- Hidden player management

**`client/src/components/schema-markup.tsx`**
- Schema.org JSON-LD generation
- Organization, SoftwareApplication, ItemList, VideoObject schemas
- React component that injects scripts into `<head>`

**`client/src/pages/home.tsx`**
- Main UI (video grid, tag filtering)
- Duration extraction logic
- Thumbnail black bar detection
- SEO schema injection

**`server/index.ts`**
- Express app setup
- Middleware stack (cookies, JSON, logging)
- Sitemap generation
- Vite dev server or static serving

**`server/routes.ts`**
- All API endpoints
- Admin authentication checks
- Thumbnail analysis endpoint
- Request validation with Zod

**`server/storage.ts`**
- Repository pattern implementation
- Smart tag filtering algorithm
- Database queries (Drizzle ORM)
- Multi-database support (Postgres/SQLite)

**`server/db.ts`**
- Database connection
- Runtime schema selection (Postgres vs SQLite)
- Connection pooling

**`shared/schema.ts`**
- Drizzle table definitions (dual: SQLite + Postgres)
- Zod validation schemas (auto-generated)
- TypeScript types (inferred)

---

## 11. Development Workflow

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# Server runs on http://localhost:5000
# - Frontend: Vite HMR (instant updates)
# - Backend: tsx watch mode (auto-restart)
```

### Environment Variables

```bash
# .env (optional)
DATABASE_URL=postgresql://user:pass@host/db  # Defaults to SQLite
ADMIN_PASSWORD=secure-password               # Defaults to "admin123"
PORT=5000                                    # Always 5000 on Replit
```

### Database Migrations

**Schema changes workflow:**
```bash
# 1. Edit shared/schema.ts
export const videosSqlite = sqliteTable("videos", {
  // ... existing fields
  thumbnail: text("thumbnail"),  // NEW FIELD
});

# 2. Push schema to database
npm run db:push

# Drizzle auto-generates SQL:
# ALTER TABLE videos ADD COLUMN thumbnail TEXT

# 3. Changes applied immediately
```

**Force push (if data loss warning):**
```bash
npm run db:push --force
```

### Build & Deploy

**Development build:**
```bash
npm run dev
# - Vite dev server with HMR
# - tsx watch mode for backend
# - SQLite database
```

**Production build:**
```bash
npm run build

# Output:
# - dist/public/  (frontend bundle)
# - dist/index.js (backend bundle)
```

**Production start:**
```bash
npm start

# - Serves bundled backend (dist/index.js)
# - Serves static frontend (dist/public)
# - PostgreSQL database (via DATABASE_URL)
```

### Common Tasks

**Add a new API endpoint:**
1. Define route in `server/routes.ts`
2. Add storage method in `server/storage.ts` (if needed)
3. Update `IStorage` interface
4. Use in frontend with TanStack Query

**Add a new page:**
1. Create `client/src/pages/my-page.tsx`
2. Add route in `client/src/App.tsx`:
   ```typescript
   <Route path="/my-page" component={MyPage} />
   ```

**Add a new database table:**
1. Define in `shared/schema.ts` (both SQLite and Postgres)
2. Create insert schema with Zod
3. Export types
4. Run `npm run db:push`

---

## 12. SEO Implementation

### Current SEO Strategy

**Phase 1 (2025): Brand Awareness**
- Primary keywords: bjjlib, bjjlibrary
- Secondary: bjj training videos, bjj app

**Phase 2 (2026+): Platform Expansion**
- bjj club management
- bjj gym software
- bjj training platform for clubs

### Implemented SEO Features

#### 1. Meta Tags (`client/index.html`)

```html
<!-- Primary Meta Tags -->
<title>Bjjlib - BJJ Training Video Library for Clubs & Gyms</title>
<meta name="description" content="Bjjlib is your BJJ training video library platform. Organize techniques, submissions, and sweeps for your club. Perfect for BJJ instructors and gym owners managing training content." />
<meta name="keywords" content="bjjlib, bjj library, bjj training videos, bjj app, bjj club management, brazilian jiu jitsu techniques, bjj gym software, martial arts training platform" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://bjjlib.com/" />

<!-- Open Graph (Social Media) -->
<meta property="og:type" content="website" />
<meta property="og:title" content="Bjjlib - BJJ Training Video Library for Clubs & Gyms" />
<meta property="og:description" content="Bjjlib is your BJJ training video library platform. Organize techniques, submissions, and sweeps for your club." />
<meta property="og:url" content="https://bjjlib.com/" />
<meta property="og:site_name" content="Bjjlib" />
<meta property="og:image" content="https://bjjlib.com/og-image.jpg" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Bjjlib - BJJ Training Video Library for Clubs & Gyms" />
<meta name="twitter:description" content="Organize BJJ techniques, submissions, and sweeps for your club. Perfect for BJJ instructors and gym owners." />
<meta property="twitter:image" content="https://bjjlib.com/og-image.jpg" />
```

#### 2. Schema.org Structured Data

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Bjjlib",
  "url": "https://bjjlib.com",
  "logo": "https://bjjlib.com/favicon.svg",
  "description": "BJJ training video library platform for clubs and gyms"
}
```

**SoftwareApplication Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bjjlib",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "ratingCount": "1"
  }
}
```

**ItemList Schema** (first 10 videos):
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "VideoObject",
        "name": "Armbar from Mount",
        "url": "https://bjjlib.com/?video=1",
        "uploadDate": "2025-10-08T10:30:00.000Z"
      }
    }
  ]
}
```

**VideoObject Schema** (per video, YouTube/Vimeo only):
```typescript
function generateVideoObjectSchema(video) {
  // Only render for YouTube/Vimeo (has thumbnailUrl)
  const youtubeId = extractYouTubeId(video.url);
  const vimeoId = extractVimeoId(video.url);
  
  if (!youtubeId && !vimeoId) return null;
  
  const thumbnailUrl = youtubeId 
    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    : `https://vumbnail.com/${vimeoId}.jpg`;
  
  const embedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}`
    : `https://player.vimeo.com/video/${vimeoId}`;
  
  // Convert "5:23" to "PT5M23S" (ISO 8601)
  const durationISO = convertDurationToISO8601(video.duration);
  
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": `BJJ technique video: ${video.title} - ${video.tags.join(', ')}`,
    "thumbnailUrl": thumbnailUrl,
    "uploadDate": new Date(video.dateAdded).toISOString(),
    "duration": durationISO,  // "PT5M23S"
    "embedUrl": embedUrl,
    "contentUrl": video.url,
    "author": { "@type": "Organization", "name": "Bjjlib" },
    "publisher": { "@type": "Organization", "name": "Bjjlib" },
    "keywords": video.tags.map(t => t.name).join(', ')
  };
}
```

**Schema Injection:**
```tsx
// In home.tsx
<SchemaMarkup schema={generateOrganizationSchema()} />
<SchemaMarkup schema={generateSoftwareApplicationSchema()} />
<SchemaMarkup schema={generateItemListSchema(videos)} />

{/* Per video */}
{hasValidSchema && (
  <SchemaMarkup schema={generateVideoObjectSchema(video)} />
)}
```

#### 3. Dynamic Sitemap

```typescript
// server/index.ts
app.get("/sitemap.xml", async (_req, res) => {
  const { videos } = await storage.getAllVideos({ limit: 1000 });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bjjlib.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${videos.map(video => `
  <url>
    <loc>https://bjjlib.com/?video=${video.id}</loc>
    <lastmod>${video.dateAdded.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
  
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});
```

#### 4. Semantic HTML

```tsx
<header>
  <h1>Bjjlib</h1>  {/* Brand */}
</header>

<section>
  <h2>Quick tag search</h2>  {/* Main feature */}
  
  <div>
    <h3>Selected tags</h3>  {/* Sub-feature */}
  </div>
  
  <div>
    <h3>Available tags</h3>  {/* Sub-feature */}
  </div>
</section>

<section>
  {/* Video grid */}
</section>
```

#### 5. Image SEO

```tsx
<img
  src={thumbnailUrl}
  alt={`BJJ technique video: ${video.title}${
    video.tags.length > 0 
      ? ` - ${video.tags.map(t => t.name).join(', ')}` 
      : ''
  }`}
/>

// Example:
// "BJJ technique video: Armbar from Mount - armbar, mount, submissions"
```

### Testing & Validation

**After deployment, validate with:**

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Check all Schema.org markup
   - Verify VideoObject compliance

2. **Google Search Console**
   - Submit sitemap: https://bjjlib.com/sitemap.xml
   - Monitor indexing status
   - Check mobile usability

3. **PageSpeed Insights**
   - URL: https://pagespeed.web.dev/
   - Performance metrics
   - SEO score

4. **Open Graph Debugger**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator

---

## Summary for Grok

### What This Application Does

Bjjlib is a **modern BJJ video library** that helps users organize and discover Brazilian Jiu-Jitsu training content through intelligent tag-based filtering.

### Core Technologies

**Frontend:**
- React 18 + Vite + TanStack Query
- shadcn/ui (Radix UI primitives)
- Wouter routing
- TypeScript strict mode

**Backend:**
- Express.js REST API
- Drizzle ORM (type-safe queries)
- Cookie-based admin auth
- Sharp.js image processing

**Database:**
- PostgreSQL (production via Neon)
- SQLite (local development)
- Same schema for both

### Unique Implementations

1. **YouTube Duration Extraction (No API Key)**
   - Hidden IFrame Player API
   - Queue-based extraction
   - Automatic database caching

2. **Smart Tag Filtering**
   - Shows only tags that narrow results
   - Excludes universal tags and selected tags
   - SQL-based co-occurrence algorithm

3. **Dynamic Thumbnail Processing**
   - Server-side variance analysis
   - Detects black bars on any color
   - Client-side CSS transforms for cropping

4. **Comprehensive SEO**
   - Schema.org JSON-LD (Organization, SoftwareApplication, ItemList, VideoObject)
   - Dynamic sitemap
   - Semantic HTML
   - SEO-optimized alt text

### Architecture Patterns

- **Repository Pattern**: `IStorage` interface for data access
- **Shared Schemas**: `/shared/schema.ts` for type safety
- **Query-Based State**: TanStack Query for all server data
- **Cookie Sessions**: Database-backed admin auth

### File Paths Reference

| Feature | Key Files |
|---------|-----------|
| Database Schema | `shared/schema.ts` |
| Data Access | `server/storage.ts` |
| API Routes | `server/routes.ts` |
| Main UI | `client/src/pages/home.tsx` |
| Duration Extraction | `client/src/lib/youtube-duration.ts` |
| SEO Schemas | `client/src/components/schema-markup.tsx` |
| Query Config | `client/src/lib/queryClient.ts` |

### Data Model

```
videos ──< video_tags >── tags
  │                         │
  id (PK)                  id (PK)
  title                    name (UNIQUE)
  url
  duration
  dateAdded
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/videos` | List videos (pagination, search, tags) |
| POST | `/api/videos` | Create video (admin) |
| PATCH | `/api/videos/:id/duration` | Update duration (system) |
| GET | `/api/co-occurring-tags` | Smart tag filtering |
| GET | `/api/analyze-thumbnail` | Black bar detection |
| POST | `/api/admin/login` | Admin login |
| GET | `/sitemap.xml` | SEO sitemap |

**This documentation provides complete context for understanding and extending the application.**
