import { neon, neonConfig } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Enable connection caching for serverless environments
neonConfig.fetchConnectionCache = true;

// Lazy initialization for database
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

function getDbInstance(): NeonHttpDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!process.env.DATABASE_URL) {
    const isCI = process.env.CI === "true";
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      throw new Error(
        "DATABASE_URL environment variable is required in production"
      );
    }

    throw new Error(
      isCI
        ? "DATABASE_URL not set. Run 'npx get-db --yes' to provision an instant database via neon.new"
        : "DATABASE_URL not set. Run 'bun run setup' or 'npx get-db --yes' to provision a database"
    );
  }

  const sql = neon(process.env.DATABASE_URL);
  dbInstance = drizzle(sql, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });

  return dbInstance;
}

// Export db as a proxy for lazy initialization
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    const instance = getDbInstance();
    const value = instance[prop as keyof typeof instance];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

// Re-export queries
export * from "./queries";
// Re-export schema for convenience
export * from "./schema";

// Type for database instance
export type Database = typeof db;
