import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { videos, tags, videoTags, adminSessions } from "@shared/schema"; // Use default exports
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

export let db: any;
export let isPostgres: boolean;
export let videosTable: typeof videos;
export let tagsTable: typeof tags;
export let videoTagsTable: typeof videoTags;
export let adminSessionsTable: typeof adminSessions;

if (NODE_ENV === "production" && DATABASE_URL) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("railway.app") ? { rejectUnauthorized: false } : false,
  });

  db = drizzlePostgres(pool, { schema: { videos, tags, videoTags, adminSessions } });
  isPostgres = true;

  // Note: PostgreSQL tables need definition if used
  videosTable = videos; // Reuses SQLite definition (adjust for PostgreSQL if needed)
  tagsTable = tags;    // Reuses SQLite definition (adjust for PostgreSQL if needed)
  videoTagsTable = videoTags; // Reuses SQLite definition (adjust for PostgreSQL if needed)
  adminSessionsTable = adminSessions; // Reuses SQLite definition (adjust for PostgreSQL if needed)

  console.log("✅ Using PostgreSQL database (Production - Railway)");
} else {
  const sqlite = new Database(join(__dirname, "..", "db.sqlite"));
  sqlite.pragma("journal_mode = WAL");
  db = drizzleSqlite(sqlite, { schema: { videos, tags, videoTags, adminSessions } });
  isPostgres = false;

  videosTable = videos;
  tagsTable = tags;
  videoTagsTable = videoTags;
  adminSessionsTable = adminSessions;

  console.log("✅ Using SQLite database (Development)");
}

// Export typed tables for storage.ts
export { videosTable as videos, tagsTable as tags, videoTagsTable as videoTags, adminSessionsTable as adminSessions };