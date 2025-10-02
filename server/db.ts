import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlite = new Database(join(__dirname, "..", "bjjlib.db"));
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
