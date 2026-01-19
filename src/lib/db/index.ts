import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Enable connection caching for serverless environments
neonConfig.fetchConnectionCache = true;

// Validate environment variable
if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the Neon SQL client
const sql = neon(process.env["DATABASE_URL"]);

// Create the Drizzle ORM instance with full schema
export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

// Re-export schema for convenience
export * from "./schema";

// Type for database instance
export type Database = typeof db;
