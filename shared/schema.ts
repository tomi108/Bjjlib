import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { pgTable, serial, text as pgText, timestamp, varchar, integer as pgInteger } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videosSqlite = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  duration: text("duration"),
  dateAdded: integer("date_added", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const videosPg = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: pgText("title").notNull(),
  url: pgText("url").notNull(),
  duration: pgText("duration"),
  dateAdded: timestamp("date_added").notNull().defaultNow(),
});

export const tagsSqlite = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category"),
});

export const tagsPg = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull().unique(),
  category: pgText("category"),
});

export const videoTagsSqlite = sqliteTable("video_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  videoId: integer("video_id").notNull().references(() => videosSqlite.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsSqlite.id, { onDelete: "cascade" }),
});

export const videoTagsPg = pgTable("video_tags", {
  id: serial("id").primaryKey(),
  videoId: pgInteger("video_id").notNull(),
  tagId: pgInteger("tag_id").notNull(),
});

export const adminSessionsSqlite = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const adminSessionsPg = pgTable("admin_sessions", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const categoriesSqlite = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const categoriesPg = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: pgText("name").notNull().unique(),
  displayOrder: pgInteger("display_order").notNull().default(0),
});

export let videos = videosSqlite;
export let tags = tagsSqlite;
export let videoTags = videoTagsSqlite;
export let adminSessions = adminSessionsSqlite;
export let categories = categoriesSqlite;

export const insertVideoSchema = createInsertSchema(videosSqlite).omit({
  id: true,
  dateAdded: true,
}).extend({
  tags: z.array(z.string()).optional(),
});

export const insertTagSchema = createInsertSchema(tagsSqlite).omit({
  id: true,
});

export const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
});

export const insertCategorySchema = createInsertSchema(categoriesSqlite).omit({
  id: true,
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type VideoTag = typeof videoTags.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type VideoWithTags = Video & { tags: Tag[] };

export const TAG_CATEGORIES = [
  "guards",
  "positions",
  "submissions",
  "sweeps",
  "takedowns",
  "escapes",
  "passes",
] as const;

export type TagCategory = typeof TAG_CATEGORIES[number] | null;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
