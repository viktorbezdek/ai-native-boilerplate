import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { parseJsonResponse } from "../helpers";

// Mock database
vi.mock("@repo/database", () => ({
  db: {
    execute: vi.fn(),
  },
  // Re-export drizzle-orm functions that are now exported from @repo/database
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  })),
}));

// Import mocked db
import { db } from "@repo/database";

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status when database is connected", async () => {
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { now: new Date() },
    ]);

    const response = await GET();
    const { status, data } = await parseJsonResponse<{
      status: string;
      services: { database: string };
      timestamp: string;
    }>(response);

    expect(status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services.database).toBe("connected");
    expect(data.timestamp).toBeDefined();
  });

  it("returns unhealthy status when database fails", async () => {
    (db.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection failed")
    );

    const response = await GET();
    const { status, data } = await parseJsonResponse<{
      status: string;
      services: { database: string };
    }>(response);

    expect(status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.services.database).toBe("disconnected");
  });
});
