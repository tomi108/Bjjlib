import { type Video, type InsertVideo, type Tag, type InsertTag, type VideoWithTags, videos, tags, videoTags } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, inArray } from "drizzle-orm";

export interface IStorage {
  getAllVideos(options?: { page?: number; limit?: number; search?: string; tagIds?: number[] }): Promise<{ videos: VideoWithTags[]; total: number }>;
  getVideo(id: number): Promise<VideoWithTags | undefined>;
  createVideo(video: InsertVideo): Promise<VideoWithTags>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<VideoWithTags | undefined>;
  deleteVideo(id: number): Promise<boolean>;
  
  getAllTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createOrGetTag(name: string): Promise<Tag>;
  
  getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]>;
  initializeDatabase(): Promise<void>;
}

export class DbStorage implements IStorage {
  async initializeDatabase(): Promise<void> {
    try {
      db.run(sql`
        CREATE TABLE IF NOT EXISTS videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          date_added INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);

      db.run(sql`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )
      `);

      db.run(sql`
        CREATE TABLE IF NOT EXISTS video_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          video_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
          UNIQUE(video_id, tag_id)
        )
      `);

      db.run(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id)`);
      db.run(sql`CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id)`);

      const defaultTags = ['fundamentals', 'guard', 'submissions', 'sweeps', 'takedowns'];
      for (const tagName of defaultTags) {
        await this.createOrGetTag(tagName);
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

      const videoIds = videoIdsSubquery.all().map((v: any) => v.videoId);
      
      if (videoIds.length === 0) {
        return { videos: [], total: 0 };
      }

      query = query.where(inArray(videos.id, videoIds));
    }

    const allResults = query.orderBy(sql`${videos.dateAdded} DESC`).all();
    const total = allResults.length;
    
    const paginatedResults = allResults.slice(offset, offset + limit);

    const videosWithTags: VideoWithTags[] = [];
    for (const video of paginatedResults) {
      const videoTagsData = db
        .select({ tagId: videoTags.tagId })
        .from(videoTags)
        .where(eq(videoTags.videoId, video.id))
        .all();

      const tagIds = videoTagsData.map((vt: any) => vt.tagId);
      
      let videoTagsList: Tag[] = [];
      if (tagIds.length > 0) {
        videoTagsList = db
          .select()
          .from(tags)
          .where(inArray(tags.id, tagIds))
          .orderBy(tags.name)
          .all();
      }

      videosWithTags.push({
        ...video,
        tags: videoTagsList,
      });
    }

    return { videos: videosWithTags, total };
  }

  async getVideo(id: number): Promise<VideoWithTags | undefined> {
    const video = db.select().from(videos).where(eq(videos.id, id)).get();
    if (!video) return undefined;

    const videoTagsData = db
      .select({ tagId: videoTags.tagId })
      .from(videoTags)
      .where(eq(videoTags.videoId, id))
      .all();

    const tagIds = videoTagsData.map((vt: any) => vt.tagId);
    
    let videoTagsList: Tag[] = [];
    if (tagIds.length > 0) {
      videoTagsList = db
        .select()
        .from(tags)
        .where(inArray(tags.id, tagIds))
        .orderBy(tags.name)
        .all();
    }

    return {
      ...video,
      tags: videoTagsList,
    };
  }

  async createVideo(insertVideo: InsertVideo): Promise<VideoWithTags> {
    const { tags: tagNames, ...videoData } = insertVideo;

    const result = db.insert(videos).values(videoData).returning().get();

    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const normalizedName = tagName.toLowerCase().trim();
        if (!normalizedName) continue;

        const tag = await this.createOrGetTag(normalizedName);
        
        try {
          db.insert(videoTags).values({
            videoId: result.id,
            tagId: tag.id,
          }).run();
        } catch (error) {
          // Ignore duplicate entries
        }
      }
    }

    return (await this.getVideo(result.id))!;
  }

  async updateVideo(id: number, updates: Partial<InsertVideo>): Promise<VideoWithTags | undefined> {
    const { tags: tagNames, ...videoUpdates } = updates;

    if (Object.keys(videoUpdates).length > 0) {
      const result = db.update(videos).set(videoUpdates).where(eq(videos.id, id)).returning().get();
      if (!result) return undefined;
    }

    if (tagNames) {
      db.delete(videoTags).where(eq(videoTags.videoId, id)).run();

      for (const tagName of tagNames) {
        const normalizedName = tagName.toLowerCase().trim();
        if (!normalizedName) continue;

        const tag = await this.createOrGetTag(normalizedName);
        
        try {
          db.insert(videoTags).values({
            videoId: id,
            tagId: tag.id,
          }).run();
        } catch (error) {
          // Ignore duplicate entries
        }
      }
    }

    return this.getVideo(id);
  }

  async deleteVideo(id: number): Promise<boolean> {
    const result = db.delete(videos).where(eq(videos.id, id)).returning().get();
    return !!result;
  }

  async getAllTags(): Promise<Tag[]> {
    return db.select().from(tags).orderBy(tags.name).all();
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return db.select().from(tags).where(eq(tags.id, id)).get();
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    return db.select().from(tags).where(eq(tags.name, name)).get();
  }

  async createOrGetTag(name: string): Promise<Tag> {
    const normalizedName = name.toLowerCase().trim();
    const existing = await this.getTagByName(normalizedName);
    if (existing) return existing;

    return db.insert(tags).values({ name: normalizedName }).returning().get();
  }

  async getCoOccurringTags(selectedTagIds: number[]): Promise<Tag[]> {
    if (selectedTagIds.length === 0) {
      return this.getAllTags();
    }

    const videoIdsWithAllTags = db
      .select({ videoId: videoTags.videoId })
      .from(videoTags)
      .where(inArray(videoTags.tagId, selectedTagIds))
      .groupBy(videoTags.videoId)
      .having(sql`COUNT(DISTINCT ${videoTags.tagId}) = ${selectedTagIds.length}`)
      .all()
      .map((v: any) => v.videoId);

    if (videoIdsWithAllTags.length === 0) {
      return [];
    }

    const coOccurringTagIds = db
      .select({ tagId: videoTags.tagId })
      .from(videoTags)
      .where(inArray(videoTags.videoId, videoIdsWithAllTags))
      .groupBy(videoTags.tagId)
      .all()
      .map((v: any) => v.tagId);

    if (coOccurringTagIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(tags)
      .where(inArray(tags.id, coOccurringTagIds))
      .orderBy(tags.name)
      .all();
  }
}

export const storage = new DbStorage();

await storage.initializeDatabase();
