import { type Video, type InsertVideo, type Tag, type InsertTag, type UpdateTag, type VideoWithTags, type AdminSession, type Category, type InsertCategory, type UpdateCategory, TAG_CATEGORIES } from "@shared/schema";
import { db, isPostgres, videos, tags, videoTags, adminSessions, categories } from "./db";
import { eq, sql, and, inArray, lt } from "drizzle-orm";

export interface IStorage {
  getAllVideos(options?: { page?: number; limit?: number; search?: string; tagIds?: number[] }): Promise<{ videos: VideoWithTags[]; total: number }>;
  getVideo(id: number): Promise<VideoWithTags | undefined>;
  createVideo(video: InsertVideo): Promise<VideoWithTags>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<VideoWithTags | undefined>;
  updateVideoDuration(id: number, duration: string): Promise<boolean>;
  deleteVideo(id: number): Promise<boolean>;
  
  getAllTags(): Promise<Tag[]>;
  getTagsByCategory(category: string | null): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createOrGetTag(name: string, category?: string | null): Promise<Tag>;
  updateTag(id: number, updates: UpdateTag): Promise<Tag | undefined>;
  renameTag(id: number, newName: string): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;
  
  getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]>;
  
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: UpdateCategory): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  createAdminSession(sessionId: string, expiresAt: Date): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<void>;
  
  initializeDatabase(): Promise<void>;
}

function dbGet<T>(results: T[] | T | undefined): T | undefined {
  if (!results) return undefined;
  if (Array.isArray(results)) return results[0];
  return results;
}

function dbAll<T>(results: T[] | T): T[] {
  if (Array.isArray(results)) return results;
  return [];
}

export class DbStorage implements IStorage {
  async initializeDatabase(): Promise<void> {
    try {
      if (isPostgres) {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS videos (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            duration TEXT,
            date_added TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
        
        await db.execute(sql`
          ALTER TABLE videos 
          ADD COLUMN IF NOT EXISTS duration TEXT
        `);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS tags (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
          )
        `);
        
        await db.execute(sql`
          ALTER TABLE tags 
          ADD COLUMN IF NOT EXISTS category TEXT
        `);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS video_tags (
            id SERIAL PRIMARY KEY,
            video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
            tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            UNIQUE(video_id, tag_id)
          )
        `);

        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id)`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id)`);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS admin_sessions (
            id VARCHAR PRIMARY KEY,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
          )
        `);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_order INTEGER NOT NULL DEFAULT 0
          )
        `);
      } else {
        await db.run(sql`
          CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            duration TEXT,
            date_added INTEGER NOT NULL DEFAULT (unixepoch())
          )
        `);
        
        try {
          await db.run(sql`ALTER TABLE videos ADD COLUMN duration TEXT`);
        } catch (e: any) {
          if (!e.message?.includes("duplicate column")) {
            console.error("Failed to add duration column:", e.message);
          }
        }

        await db.run(sql`
          CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
          )
        `);
        
        try {
          await db.run(sql`ALTER TABLE tags ADD COLUMN category TEXT`);
        } catch (e: any) {
          if (!e.message?.includes("duplicate column")) {
            console.error("Failed to add category column:", e.message);
          }
        }

        await db.run(sql`
          CREATE TABLE IF NOT EXISTS video_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            UNIQUE(video_id, tag_id)
          )
        `);

        await db.run(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id)`);

        await db.run(sql`
          CREATE TABLE IF NOT EXISTS admin_sessions (
            id TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL DEFAULT (unixepoch()),
            expires_at INTEGER NOT NULL
          )
        `);

        await db.run(sql`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            display_order INTEGER NOT NULL DEFAULT 0
          )
        `);
      }

      const defaultTags = ['fundamentals', 'guard', 'submissions', 'sweeps', 'takedowns'];
      for (const tagName of defaultTags) {
        await this.createOrGetTag(tagName);
      }

      for (let i = 0; i < TAG_CATEGORIES.length; i++) {
        const categoryName = TAG_CATEGORIES[i];
        await this.createCategory({ name: categoryName, displayOrder: i });
      }
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }

  async getAllVideos(options?: { page?: number; limit?: number; search?: string; tagIds?: number[] }): Promise<{ videos: VideoWithTags[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const search = options?.search?.toLowerCase();
    const tagIds = options?.tagIds || [];

    let query = db.select().from(videos);
    
    if (search) {
      query = query.where(sql`LOWER(${videos.title}) LIKE ${'%' + search + '%'}`);
    }

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

    const queryWithOrder = query.orderBy(sql`${videos.dateAdded} DESC`);
    const allResults = isPostgres ? await queryWithOrder : queryWithOrder.all();
    const allResultsArray = dbAll(allResults);
    const total = allResultsArray.length;
    
    const paginatedResults = allResultsArray.slice(offset, offset + limit);

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

  async getVideo(id: number): Promise<VideoWithTags | undefined> {
    const videoQuery = db.select().from(videos).where(eq(videos.id, id));
    const video = dbGet(isPostgres ? await videoQuery : videoQuery.get());
    if (!video) return undefined;

    const videoTagsQuery = db
      .select({ tagId: videoTags.tagId })
      .from(videoTags)
      .where(eq(videoTags.videoId, id));
    
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

    return {
      ...video,
      tags: videoTagsList,
    };
  }

  async createVideo(insertVideo: InsertVideo): Promise<VideoWithTags> {
    const { tags: tagNames, ...videoData } = insertVideo;

    const result = dbGet(await db.insert(videos).values(videoData).returning());
    if (!result) throw new Error("Failed to create video");

    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const normalizedName = tagName.toLowerCase().trim();
        if (!normalizedName) continue;

        const tag = await this.createOrGetTag(normalizedName);
        
        try {
          if (isPostgres) {
            await db.insert(videoTags).values({
              videoId: result.id,
              tagId: tag.id,
            });
          } else {
            db.insert(videoTags).values({
              videoId: result.id,
              tagId: tag.id,
            }).run();
          }
        } catch (error) {
        }
      }
    }

    return (await this.getVideo(result.id))!;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<VideoWithTags | undefined> {
    const { tags: tagNames, ...videoUpdates } = updates;

    if (Object.keys(videoUpdates).length > 0) {
      const result = dbGet(await db.update(videos).set(videoUpdates).where(eq(videos.id, id)).returning());
      if (!result) return undefined;
    }

    if (tagNames) {
      if (isPostgres) {
        await db.delete(videoTags).where(eq(videoTags.videoId, id));
      } else {
        db.delete(videoTags).where(eq(videoTags.videoId, id)).run();
      }

      for (const tagName of tagNames) {
        const normalizedName = tagName.toLowerCase().trim();
        if (!normalizedName) continue;

        const tag = await this.createOrGetTag(normalizedName);
        
        try {
          if (isPostgres) {
            await db.insert(videoTags).values({
              videoId: id,
              tagId: tag.id,
            });
          } else {
            db.insert(videoTags).values({
              videoId: id,
              tagId: tag.id,
            }).run();
          }
        } catch (error) {
        }
      }
    }

    return this.getVideo(id);
  }

  async updateVideoDuration(id: number, duration: string): Promise<boolean> {
    const result = dbGet(await db.update(videos).set({ duration }).where(eq(videos.id, id)).returning());
    return !!result;
  }

  async deleteVideo(id: number): Promise<boolean> {
    const result = dbGet(await db.delete(videos).where(eq(videos.id, id)).returning());
    return !!result;
  }

  async getAllTags(): Promise<Tag[]> {
    const tagsQuery = db
      .selectDistinct({ id: tags.id, name: tags.name, category: tags.category })
      .from(tags)
      .innerJoin(videoTags, eq(tags.id, videoTags.tagId))
      .orderBy(tags.name);
    
    const tagsWithVideos = isPostgres ? await tagsQuery : tagsQuery.all();
    return dbAll(tagsWithVideos);
  }

  async getTagsByCategory(category: string | null): Promise<Tag[]> {
    const tagsQuery = db
      .selectDistinct({ id: tags.id, name: tags.name, category: tags.category })
      .from(tags)
      .innerJoin(videoTags, eq(tags.id, videoTags.tagId))
      .where(category === null ? sql`${tags.category} IS NULL` : eq(tags.category, category))
      .orderBy(tags.name);
    
    const tagsWithVideos = isPostgres ? await tagsQuery : tagsQuery.all();
    return dbAll(tagsWithVideos);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const query = db.select().from(tags).where(eq(tags.id, id));
    return dbGet(isPostgres ? await query : query.get());
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const query = db.select().from(tags).where(eq(tags.name, name));
    return dbGet(isPostgres ? await query : query.get());
  }

  async createOrGetTag(name: string, category: string | null = null): Promise<Tag> {
    const normalizedName = name.toLowerCase().trim();
    const existing = await this.getTagByName(normalizedName);
    if (existing) return existing;

    const result = dbGet(await db.insert(tags).values({ name: normalizedName, category }).returning());
    if (!result) throw new Error("Failed to create tag");
    return result;
  }

  async updateTag(id: number, updates: UpdateTag): Promise<Tag | undefined> {
    const result = dbGet(await db.update(tags).set(updates).where(eq(tags.id, id)).returning());
    return result;
  }

  async renameTag(id: number, newName: string): Promise<Tag | undefined> {
    const normalizedName = newName.toLowerCase().trim();
    const result = dbGet(await db.update(tags).set({ name: normalizedName }).where(eq(tags.id, id)).returning());
    return result;
  }

  async deleteTag(id: number): Promise<boolean> {
    const result = dbGet(await db.delete(tags).where(eq(tags.id, id)).returning());
    return !!result;
  }

  async getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]> {
    if (selectedTagIds.length === 0) {
      return this.getAllTags();
    }

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

    const usefulTagIds = tagCounts
      .filter((tc: any) => 
        tc.count < totalFilteredVideos && 
        !selectedTagIds.includes(tc.tagId)
      )
      .map((tc: any) => tc.tagId);

    if (usefulTagIds.length === 0) {
      return [];
    }

    const tagsQuery = db
      .select()
      .from(tags)
      .where(inArray(tags.id, usefulTagIds))
      .orderBy(tags.name);
    
    const result = isPostgres ? await tagsQuery : tagsQuery.all();
    return dbAll(result);
  }

  async getAllCategories(): Promise<Category[]> {
    const query = db.select().from(categories).orderBy(categories.displayOrder, categories.name);
    const result = isPostgres ? await query : query.all();
    return dbAll(result);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const query = db.select().from(categories).where(eq(categories.id, id));
    return dbGet(isPostgres ? await query : query.get());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const result = dbGet(await db.insert(categories).values(category).returning());
      if (!result) throw new Error("Failed to create category");
      return result;
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint")) {
        const existing = dbGet(await db.select().from(categories).where(eq(categories.name, category.name)));
        if (existing) return existing;
      }
      throw error;
    }
  }

  async updateCategory(id: number, updates: UpdateCategory): Promise<Category | undefined> {
    const result = dbGet(await db.update(categories).set(updates).where(eq(categories.id, id)).returning());
    return result;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = dbGet(await db.delete(categories).where(eq(categories.id, id)).returning());
    return !!result;
  }

  async createAdminSession(sessionId: string, expiresAt: Date): Promise<AdminSession> {
    const result = dbGet(await db.insert(adminSessions).values({
      id: sessionId,
      expiresAt,
    }).returning());
    
    if (!result) throw new Error("Failed to create session");
    return result;
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    const query = db.select().from(adminSessions).where(eq(adminSessions.id, sessionId));
    const session = dbGet(isPostgres ? await query : query.get());
    if (!session) return undefined;
    
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteAdminSession(sessionId);
      return undefined;
    }
    
    return session;
  }

  async deleteAdminSession(sessionId: string): Promise<boolean> {
    const result = dbGet(await db.delete(adminSessions).where(eq(adminSessions.id, sessionId)).returning());
    return !!result;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    if (isPostgres) {
      await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
    } else {
      db.delete(adminSessions).where(lt(adminSessions.expiresAt, now)).run();
    }
  }
}

export const storage = new DbStorage();
