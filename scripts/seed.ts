import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import "dotenv/config";

async function seed() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🌱 Seeding database...");

  const sql = neon(process.env["DATABASE_URL"]);
  const db = drizzle(sql, { schema });

  // Create test user
  const [testUser] = await db
    .insert(schema.users)
    .values({
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      role: "user",
    })
    .onConflictDoNothing()
    .returning();

  if (testUser) {
    console.log(`✅ Created test user: ${testUser.email}`);

    // Create test subscription
    await db
      .insert(schema.subscriptions)
      .values({
        userId: testUser.id,
        status: "trialing",
      })
      .onConflictDoNothing();

    console.log("✅ Created test subscription");
  } else {
    console.log("ℹ️ Test user already exists");
  }

  // Create admin user
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: "admin@example.com",
      name: "Admin User",
      emailVerified: true,
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log(`✅ Created admin user: ${adminUser.email}`);
  } else {
    console.log("ℹ️ Admin user already exists");
  }

  console.log("🎉 Seeding complete!");
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
