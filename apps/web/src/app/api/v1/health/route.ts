import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: "connected" | "disconnected";
  };
}

export async function GET() {
  const status: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    services: {
      database: "disconnected",
    },
  };

  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    status.services.database = "connected";
  } catch {
    status.status = "unhealthy";
    status.services.database = "disconnected";
  }

  const httpStatus = status.status === "healthy" ? 200 : 503;

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
