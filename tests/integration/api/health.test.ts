import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseJsonResponse } from "../helpers";

// Mock database at module level
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

import { GET } from "@/app/api/v1/health/route";
// Import after mocks are set up
import { db } from "@/lib/db";

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status when database is connected", async () => {
    vi.mocked(db.execute).mockResolvedValue([{ now: new Date() }] as never);

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
    vi.mocked(db.execute).mockRejectedValue(new Error("Connection failed"));

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
