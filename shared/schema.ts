import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  dateAdded: integer("date_added", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const videoTags = sqliteTable("video_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  dateAdded: true,
}).extend({
  tags: z.array(z.string()).optional(),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type VideoTag = typeof videoTags.$inferSelect;

export type VideoWithTags = Video & { tags: Tag[] };
