import { type Video, type InsertVideo, type Tag, type InsertTag, type VideoWithTags, type AdminSession } from "@shared/schema";
import { db, isPostgres, videos, tags, videoTags, adminSessions } from "./db";
import { eq, sql, and, inArray, lt } from "drizzle-orm";

export interface IStorage {
  getAllVideos(options?: { page?: number; limit?: number; search?: string; tagIds?: number[] }): Promise<{ videos: VideoWithTags[]; total: number }>;
  getVideo(id: number): Promise<VideoWithTags | undefined>;
  createVideo(video: InsertVideo): Promise<VideoWithTags>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<VideoWithTags | undefined>;
  updateVideoDuration(id: number, duration: string): Promise<boolean>;
  deleteVideo(id: number): Promise<boolean>;
  getAllTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createOrGetTag(name: string): Promise<Tag>;
  getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]>;
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
  return results ? [results] : [];
}

export class DbStorage implements IStorage {
  async initializeDatabase(): Promise<void> {
    try {
      console.log("✅ Database initialized with existing schema via migrations");
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  }

  async getAllVideos({
    page = 1,
    limit = 20,
    search,
    tagIds,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    tagIds?: number[];
  }): Promise<{ videos: VideoWithTags[]; total: number }> {
    const offset = (page - 1) * limit;
    const searchLower = search?.toLowerCase();
    let query = db.select().from(videos).limit(limit).offset(offset);

    if (searchLower) {
      query = query.where(sql`LOWER(${videos.title}) LIKE ${`%${searchLower}%`}`);
    }

    if (tagIds && tagIds.length > 0) {
      const videoIdsSubquery = db
        .select({ videoId: videoTags.videoId })
        .from(videoTags)
        .where(inArray(videoTags.tagId, tagIds))
        .groupBy(videoTags.videoId)
        .having(sql`COUNT(DISTINCT ${videoTags.tagId}) = ${tagIds.length}`);
      const videoIdsResults = await videoIdsSubquery;
      const videoIds = dbAll(videoIdsResults).map((v) => v.videoId);

      if (videoIds.length === 0) {
        return { videos: [], total: 0 };
      }
      query = query.where(inArray(videos.id, videoIds));
    }

    const queryWithOrder = query.orderBy(sql`${videos.dateAdded} DESC`);
    const allResults = await queryWithOrder;
    const allResultsArray = dbAll(allResults);
    const total = allResultsArray.length;

    const paginatedResults = allResultsArray.slice(offset, offset + limit);
    const videosWithTags: VideoWithTags[] = await Promise.all(
      paginatedResults.map(async (video) => {
        const tagsForVideo = await this.getTagsForVideo(video.id);
        return { ...video, tags: tagsForVideo } as VideoWithTags;
      })
    );
    return { videos: videosWithTags, total };
  }

  async getVideo(id: number): Promise<VideoWithTags | undefined> {
    const videoQuery = db.select().from(videos).where(eq(videos.id, id));
    const video = dbGet(await videoQuery);
    if (!video) return undefined;
    const tagsForVideo = await this.getTagsForVideo(id);
    return { ...video, tags: tagsForVideo } as VideoWithTags;
  }

  async createVideo(insertVideo: InsertVideo): Promise<VideoWithTags> {
    const { tags: tagNames, ...videoData } = insertVideo;
    const [result] = await db
      .insert(videos)
      .values({ ...videoData, dateAdded: Math.floor(Date.now() / 1000) })
      .returning();
    if (!result) throw new Error("Failed to create video");
    if (tagNames && tagNames.length > 0) {
      await this.syncTags(result.id, tagNames);
    }
    return (await this.getVideo(result.id))!;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<VideoWithTags | undefined> {
    const { tags: tagNames, ...videoUpdates } = updates;
    if (Object.keys(videoUpdates).length > 0) {
      const [result] = await db.update(videos).set(videoUpdates).where(eq(videos.id, id)).returning();
      if (!result) return undefined;
    }
    if (tagNames) {
      await this.syncTags(id, tagNames);
    }
    return this.getVideo(id);
  }

  async updateVideoDuration(id: number, duration: string): Promise<boolean> {
    const numericDuration = parseInt(duration) || 0;
    const [result] = await db
      .update(videos)
      .set({ duration: numericDuration })
      .where(eq(videos.id, id))
      .returning({ updated: sql`1` });
    return !!result;
  }

  async deleteVideo(id: number): Promise<boolean> {
    const [result] = await db
      .delete(videos)
      .where(eq(videos.id, id))
      .returning({ deleted: sql`1` });
    return !!result;
  }

  async getAllTags(): Promise<Tag[]> {
    const tagsQuery = db.select().from(tags);
    const tagsResult = await tagsQuery;
    return dbAll(tagsResult).map((tag) => ({ id: tag.id, name: tag.name }));
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const query = db.select().from(tags).where(eq(tags.id, id));
    const result = await query;
    return dbGet(result);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const query = db.select().from(tags).where(eq(tags.name, name));
    const result = await query;
    return dbGet(result);
  }

  async createOrGetTag(name: string): Promise<Tag> {
    const normalizedName = name.toLowerCase().trim();
    const existing = await this.getTagByName(normalizedName);
    if (existing) return existing;
    const [result] = await db.insert(tags).values({ name: normalizedName }).returning();
    if (!result) throw new Error("Failed to create tag");
    return result;
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

    const videoIdsResults = await videoIdsQuery;
    const videoIdsWithAllTags = dbAll(videoIdsResults).map((v) => v.videoId);
    if (videoIdsWithAllTags.length === 0) {
      return [];
    }

    const totalFilteredVideos = videoIdsWithAllTags.length;
    const tagCountsQuery = db
      .select({
        tagId: videoTags.tagId,
        count: sql<number>`COUNT(DISTINCT ${videoTags.videoId})`.as("count"),
      })
      .from(videoTags)
      .where(inArray(videoTags.videoId, videoIdsWithAllTags))
      .groupBy(videoTags.tagId);

    const tagCountsResults = await tagCountsQuery;
    const tagCounts = dbAll(tagCountsResults);
    const usefulTagIds = tagCounts
      .filter((tc) => tc.count < totalFilteredVideos && !selectedTagIds.includes(tc.tagId))
      .map((tc) => tc.tagId);
    if (usefulTagIds.length === 0) {
      return [];
    }

    const tagsQuery = db.select().from(tags).where(inArray(tags.id, usefulTagIds)).orderBy(tags.name);
    const result = await tagsQuery;
    return dbAll(result);
  }

  async createAdminSession(sessionId: string, expiresAt: Date): Promise<AdminSession> {
    const [result] = await db
      .insert(adminSessions)
      .values({
        id: sessionId,
        expiresAt, // Pass Date object directly, let Drizzle handle conversion
      })
      .returning();
    if (!result) throw new Error("Failed to create session");
    return result;
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    const query = db.select().from(adminSessions).where(eq(adminSessions.id, sessionId));
    const session = dbGet(await query);
    if (!session) return undefined;
    if (lt(adminSessions.expiresAt, sql`${Math.floor(Date.now() / 1000)}`)) {
      await this.deleteAdminSession(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteAdminSession(sessionId: string): Promise<boolean> {
    const [result] = await db
      .delete(adminSessions)
      .where(eq(adminSessions.id, sessionId))
      .returning({ deleted: sql`1` });
    return !!result;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.delete(adminSessions).where(lt(adminSessions.expiresAt, sql`${now}`));
  }

  // Private helper methods
  private async getTagsForVideo(videoId: number): Promise<Tag[]> {
    const videoTagsQuery = db
      .select({ id: tags.id, name: tags.name })
      .from(videoTags)
      .innerJoin(tags, eq(videoTags.tagId, tags.id))
      .where(eq(videoTags.videoId, videoId));
    const tagsResult = await videoTagsQuery;
    return dbAll(tagsResult);
  }

  private async syncTags(videoId: number, tagNames: string[]) {
    const existingTags = await this.getTagsForVideo(videoId);
    const existingTagNames = new Set(existingTags.map((t) => t.name));

    // Remove tags no longer in the list
    const tagsToRemove = existingTags.filter((tag) => !tagNames.includes(tag.name));
    for (const tag of tagsToRemove) {
      await db.delete(videoTags).where(eq(videoTags.videoId, videoId)).where(eq(videoTags.tagId, tag.id));
    }

    // Add or get new tags
    for (const name of tagNames) {
      if (!existingTagNames.has(name)) {
        const tag = await this.createOrGetTag(name);
        await db.insert(videoTags).values({ videoId, tagId: tag.id });
      }
    }
  }
}

export const storage = new DbStorage();