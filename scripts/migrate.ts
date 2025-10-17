// scripts/migrate.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

async function main() {
  // Connect to your local SQLite file
  const sqlite = new Database("db.sqlite");
  const db = drizzle(sqlite);

  // Applies SQL files from ./migrations
  await migrate(db, { migrationsFolder: "migrations" });

  console.log("✅ Migrations applied");
  sqlite.close();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
