import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pkg from "pg";
const { Pool } = pkg;
import { videosSqlite, tagsSqlite, videoTagsSqlite, adminSessionsSqlite, tagCategoriesSqlite, videosPg, tagsPg, videoTagsPg, adminSessionsPg, tagCategoriesPg } from "@shared/schema";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

export let db: any;
export let isPostgres: boolean;
export let videos: any;
export let tags: any;
export let videoTags: any;
export let adminSessions: any;
export let tagCategories: any;

if (NODE_ENV === "production" && DATABASE_URL) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway.app') ? { rejectUnauthorized: false } : false
  });
  
  const schema = { videos: videosPg, tags: tagsPg, videoTags: videoTagsPg, adminSessions: adminSessionsPg, tagCategories: tagCategoriesPg };
  db = drizzlePostgres(pool, { schema });
  isPostgres = true;
  
  videos = videosPg;
  tags = tagsPg;
  videoTags = videoTagsPg;
  adminSessions = adminSessionsPg;
  tagCategories = tagCategoriesPg;
  
  console.log("✅ Using PostgreSQL database (Production - Railway)");
} else {
  const sqlite = new Database(join(__dirname, "..", "bjjlib.db"));
  sqlite.pragma("journal_mode = WAL");
  const schema = { videos: videosSqlite, tags: tagsSqlite, videoTags: videoTagsSqlite, adminSessions: adminSessionsSqlite, tagCategories: tagCategoriesSqlite };
  db = drizzleSqlite(sqlite, { schema });
  isPostgres = false;
  
  videos = videosSqlite;
  tags = tagsSqlite;
  videoTags = videoTagsSqlite;
  adminSessions = adminSessionsSqlite;
  tagCategories = tagCategoriesSqlite;
  
  console.log("✅ Using SQLite database (Development)");
}
