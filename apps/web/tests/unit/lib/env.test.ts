import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// We'll test the createEnvValidator factory function
import { createEnvValidator } from "@/lib/env";

describe("createEnvValidator", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    delete process.env.SKIP_ENV_VALIDATION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should validate environment variables against schema", () => {
    const schema = z.object({
      TEST_VAR: z.string(),
    });
    const cache = { value: null as z.infer<typeof schema> | null };
    const getEnv = () => ({ TEST_VAR: "test-value" });

    const validate = createEnvValidator(schema, getEnv, cache);
    const result = validate();

    expect(result).toEqual({ TEST_VAR: "test-value" });
  });

  it("should cache the validated result", () => {
    const schema = z.object({
      TEST_VAR: z.string(),
    });
    const cache = { value: null as z.infer<typeof schema> | null };
    let callCount = 0;
    const getEnv = () => {
      callCount++;
      return { TEST_VAR: "test-value" };
    };

    const validate = createEnvValidator(schema, getEnv, cache);

    validate();
    validate();
    validate();

    // getEnv should only be called once due to caching
    expect(callCount).toBe(1);
  });

  it("should return cached value if already validated", () => {
    const schema = z.object({
      TEST_VAR: z.string(),
    });
    const cachedValue = { TEST_VAR: "cached-value" };
    const cache = { value: cachedValue };
    const getEnv = vi.fn(() => ({ TEST_VAR: "new-value" }));

    const validate = createEnvValidator(schema, getEnv, cache);
    const result = validate();

    expect(result).toEqual(cachedValue);
    expect(getEnv).not.toHaveBeenCalled();
  });

  it("should throw error for invalid environment variables", () => {
    const schema = z.object({
      REQUIRED_VAR: z.string().min(1),
    });
    const cache = { value: null as z.infer<typeof schema> | null };
    const getEnv = () => ({ REQUIRED_VAR: "" });

    const validate = createEnvValidator(schema, getEnv, cache);

    expect(() => validate()).toThrow("Invalid environment variables");
  });

  it("should skip validation when SKIP_ENV_VALIDATION is true", () => {
    process.env.SKIP_ENV_VALIDATION = "true";

    const schema = z.object({
      REQUIRED_VAR: z.string().min(1),
    });
    const cache = { value: null as z.infer<typeof schema> | null };
    const getEnv = () => ({ REQUIRED_VAR: "" }); // Would normally fail

    const validate = createEnvValidator(schema, getEnv, cache);
    const result = validate();

    // Should return empty object instead of throwing
    expect(result).toEqual({});
  });

  it("should handle optional fields correctly", () => {
    const schema = z.object({
      REQUIRED_VAR: z.string(),
      OPTIONAL_VAR: z.string().optional(),
    });
    const cache = { value: null as z.infer<typeof schema> | null };
    const getEnv = () => ({ REQUIRED_VAR: "value" });

    const validate = createEnvValidator(schema, getEnv, cache);
    const result = validate();

    expect(result).toEqual({ REQUIRED_VAR: "value" });
  });
});
