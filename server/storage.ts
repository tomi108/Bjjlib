import { type Video, type InsertVideo, type Tag, type InsertTag } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Video operations
  getAllVideos(): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<boolean>;
  
  // Tag operations
  getAllTags(): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, tag: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<boolean>;
  updateTagCounts(): Promise<void>;
}

export class MemStorage implements IStorage {
  private videos: Map<string, Video>;
  private tags: Map<string, Tag>;

  constructor() {
    this.videos = new Map();
    this.tags = new Map();
    this.initializeDefaultTags();
  }

  private async initializeDefaultTags() {
    const defaultTags = ['Fundamentals', 'Guard', 'Submissions', 'Sweeps', 'Takedowns'];
    for (const tagName of defaultTags) {
      await this.createTag({ name: tagName });
    }
  }

  // Video operations
  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      ...insertVideo,
      id,
      dateAdded: new Date(),
      tags: insertVideo.tags || [],
      description: insertVideo.description || null,
    };
    this.videos.set(id, video);
    await this.updateTagCounts();
    return video;
  }

  async updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    const existingVideo = this.videos.get(id);
    if (!existingVideo) return undefined;

    const updatedVideo: Video = { ...existingVideo, ...updates };
    this.videos.set(id, updatedVideo);
    await this.updateTagCounts();
    return updatedVideo;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const deleted = this.videos.delete(id);
    if (deleted) {
      await this.updateTagCounts();
    }
    return deleted;
  }

  // Tag operations
  async getAllTags(): Promise<Tag[]> {
    return Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTag(id: string): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find(tag => tag.name === name);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const existing = await this.getTagByName(insertTag.name);
    if (existing) return existing;

    const id = randomUUID();
    const tag: Tag = {
      ...insertTag,
      id,
      videoCount: "0",
    };
    this.tags.set(id, tag);
    await this.updateTagCounts();
    return tag;
  }

  async updateTag(id: string, updates: Partial<InsertTag>): Promise<Tag | undefined> {
    const existingTag = this.tags.get(id);
    if (!existingTag) return undefined;

    const updatedTag: Tag = { ...existingTag, ...updates };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: string): Promise<boolean> {
    const tag = this.tags.get(id);
    if (!tag) return false;

    // Remove tag from all videos
    const videosArray = Array.from(this.videos.values());
    for (const video of videosArray) {
      if (video.tags?.includes(tag.name)) {
        video.tags = video.tags.filter((t: string) => t !== tag.name);
        this.videos.set(video.id, video);
      }
    }

    this.tags.delete(id);
    await this.updateTagCounts();
    return true;
  }

  async updateTagCounts(): Promise<void> {
    const tagCounts = new Map<string, number>();
    
    // Count tags across all videos
    const videosArray = Array.from(this.videos.values());
    for (const video of videosArray) {
      if (video.tags) {
        for (const tagName of video.tags) {
          tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
        }
      }
    }

    // Update tag counts
    const tagsArray = Array.from(this.tags.values());
    for (const tag of tagsArray) {
      tag.videoCount = (tagCounts.get(tag.name) || 0).toString();
    }
  }
}

export const storage = new MemStorage();
