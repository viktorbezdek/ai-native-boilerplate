import {
  createProjectSchema,
  paginationSchema,
  updateProjectSchema,
} from "@/lib/validations";
import { describe, expect, it } from "vitest";

describe("createProjectSchema", () => {
  it("validates a valid project", () => {
    const result = createProjectSchema.safeParse({
      name: "My Project",
      description: "A test project",
    });

    expect(result.success).toBe(true);
  });

  it("requires a name", () => {
    const result = createProjectSchema.safeParse({
      description: "A test project",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("name");
    }
  });

  it("allows empty description", () => {
    const result = createProjectSchema.safeParse({
      name: "My Project",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createProjectSchema.safeParse({
      name: "",
      description: "A test project",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name that is too long", () => {
    const result = createProjectSchema.safeParse({
      name: "a".repeat(256),
      description: "A test project",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  it("validates partial updates", () => {
    const result = updateProjectSchema.safeParse({
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("allows description-only updates", () => {
    const result = updateProjectSchema.safeParse({
      description: "New description",
    });

    expect(result.success).toBe(true);
  });

  it("validates both fields together", () => {
    const result = updateProjectSchema.safeParse({
      name: "Updated Name",
      description: "New description",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid name", () => {
    const result = updateProjectSchema.safeParse({
      name: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("provides defaults", () => {
    const result = paginationSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    }
  });

  it("accepts valid pagination", () => {
    const result = paginationSchema.safeParse({
      page: 2,
      limit: 20,
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative page", () => {
    const result = paginationSchema.safeParse({
      page: -1,
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects limit over 100", () => {
    const result = paginationSchema.safeParse({
      page: 1,
      limit: 101,
    });

    expect(result.success).toBe(false);
  });

  it("coerces string values", () => {
    const result = paginationSchema.safeParse({
      page: "2",
      limit: "20",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
    }
  });
});
