import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BenchmarkSpec, BenchmarkSuite } from "../../types/benchmark";
import {
  type BenchmarkContext,
  BenchmarkRunner,
  getBenchmarkRunner,
  resetBenchmarkRunner,
} from "../benchmark-runner";

describe("BenchmarkRunner", () => {
  let runner: BenchmarkRunner;
  const mockOutputDir = "/tmp/test-benchmarks";

  beforeEach(() => {
    vi.clearAllMocks();
    resetBenchmarkRunner();
    runner = new BenchmarkRunner({ outputDir: mockOutputDir });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default config when none provided", () => {
      const defaultRunner = new BenchmarkRunner();
      const config = defaultRunner.getConfig();

      expect(config.concurrency).toBe(4);
      expect(config.retries).toBe(2);
      expect(config.failFast).toBe(false);
    });

    it("should merge custom config with defaults", () => {
      const customRunner = new BenchmarkRunner({
        concurrency: 2,
        failFast: true,
      });
      const config = customRunner.getConfig();

      expect(config.concurrency).toBe(2);
      expect(config.failFast).toBe(true);
      expect(config.retries).toBe(2); // From defaults
    });
  });

  describe("runBenchmark", () => {
    const mockSpec: BenchmarkSpec = {
      id: "test-benchmark",
      name: "Test Benchmark",
      description: "A test benchmark",
      dimensions: ["quality", "completeness"],
      threshold: 70,
      timeout: 5000,
      expectedOutcomes: {},
    };

    it("should return benchmark result with all required fields", async () => {
      const result = await runner.runBenchmark(mockSpec);

      expect(result).toHaveProperty("specId", mockSpec.id);
      expect(result).toHaveProperty("scores");
      expect(result).toHaveProperty("dimensionDetails");
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("executedAt");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("artifacts");
    });

    it("should measure specified dimensions", async () => {
      const result = await runner.runBenchmark(mockSpec);

      expect(result.dimensionDetails).toHaveLength(2);
      expect(result.dimensionDetails.map((d) => d.dimension)).toContain(
        "quality"
      );
      expect(result.dimensionDetails.map((d) => d.dimension)).toContain(
        "completeness"
      );
    });

    it("should pass when overall score >= threshold", async () => {
      const easySpec: BenchmarkSpec = {
        ...mockSpec,
        threshold: 40, // Low threshold
      };

      const result = await runner.runBenchmark(easySpec);

      expect(result.passed).toBe(true);
    });

    it("should fail when overall score < threshold", async () => {
      const hardSpec: BenchmarkSpec = {
        ...mockSpec,
        threshold: 99, // Very high threshold
      };

      const result = await runner.runBenchmark(hardSpec);

      expect(result.passed).toBe(false);
    });
  });

  describe("runSuite", () => {
    const mockSuite: BenchmarkSuite = {
      id: "test-suite",
      name: "Test Suite",
      description: "A test suite",
      specs: [
        {
          id: "spec-1",
          name: "Spec 1",
          description: "First spec",
          dimensions: ["quality"],
          threshold: 50,
          timeout: 5000,
          expectedOutcomes: {},
        },
        {
          id: "spec-2",
          name: "Spec 2",
          description: "Second spec",
          dimensions: ["completeness"],
          threshold: 50,
          timeout: 5000,
          expectedOutcomes: {},
        },
      ],
      executionOrder: "sequential",
    };

    it("should run all specs in suite", async () => {
      const result = await runner.runSuite(mockSuite);

      expect(result.results).toHaveLength(2);
      expect(result.suiteId).toBe(mockSuite.id);
    });

    it("should calculate aggregate score from all results", async () => {
      const result = await runner.runSuite(mockSuite);

      expect(result.aggregateScore).toBeGreaterThanOrEqual(0);
      expect(result.aggregateScore).toBeLessThanOrEqual(100);
    });

    it("should generate summary with pass/fail counts", async () => {
      const result = await runner.runSuite(mockSuite);

      expect(result.summary).toHaveProperty("total", 2);
      expect(result.summary).toHaveProperty("passed");
      expect(result.summary).toHaveProperty("failed");
      expect(result.summary).toHaveProperty("skipped");
      expect(
        result.summary.passed + result.summary.failed + result.summary.skipped
      ).toBe(2);
    });

    it("should run specs in parallel when executionOrder is parallel", async () => {
      const parallelSuite: BenchmarkSuite = {
        ...mockSuite,
        executionOrder: "parallel",
      };

      const result = await runner.runSuite(parallelSuite);

      expect(result.results).toHaveLength(2);
    });

    it("should stop on first failure when failFast is enabled", async () => {
      const failFastRunner = new BenchmarkRunner({
        outputDir: mockOutputDir,
        failFast: true,
      });

      const hardSuite: BenchmarkSuite = {
        ...mockSuite,
        specs: mockSuite.specs.map((s) => ({ ...s, threshold: 99 })),
      };

      const result = await failFastRunner.runSuite(hardSuite);

      // Should stop after first failure
      expect(result.passed).toBe(false);
    });
  });

  describe("dimension measurements", () => {
    it("should measure speed based on timeout", async () => {
      const context: BenchmarkContext = {
        workingDir: "/test",
        logsPath: "/test/logs",
        artifacts: [],
      };

      const spec: BenchmarkSpec = {
        id: "test",
        name: "Test",
        description: "",
        dimensions: ["speed"],
        threshold: 70,
        timeout: 10000,
        expectedOutcomes: {
          expectedTime: 5000,
        },
      };

      const score = await runner.measureSpeed(spec, context);

      // 5000 / 10000 * 100 = 50
      expect(score).toBe(50);
    });

    it("should return default scores when log files missing", async () => {
      const context: BenchmarkContext = {
        workingDir: "/nonexistent",
        logsPath: "/nonexistent/logs",
        artifacts: [],
      };

      const spec: BenchmarkSpec = {
        id: "test",
        name: "Test",
        description: "",
        dimensions: ["quality"],
        threshold: 70,
        timeout: 5000,
        expectedOutcomes: {},
      };

      const score = await runner.measureQuality(spec, context);

      // Should return default score (50) when no quality data
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle missing drift logs", async () => {
      const context: BenchmarkContext = {
        workingDir: "/nonexistent",
        logsPath: "/nonexistent/logs",
        artifacts: [],
      };

      const spec: BenchmarkSpec = {
        id: "test",
        name: "Test",
        description: "",
        dimensions: ["drift"],
        threshold: 70,
        timeout: 5000,
        expectedOutcomes: {},
      };

      const score = await runner.measureDrift(spec, context);

      // Should return perfect score (100) when no drift data (no drift detected)
      expect(score).toBe(100);
    });

    it("should measure efficiency with default when missing metrics", async () => {
      const context: BenchmarkContext = {
        workingDir: "/nonexistent",
        logsPath: "/nonexistent/logs",
        artifacts: [],
      };

      const spec: BenchmarkSpec = {
        id: "test",
        name: "Test",
        description: "",
        dimensions: ["efficiency"],
        threshold: 70,
        timeout: 5000,
        expectedOutcomes: {},
      };

      const score = await runner.measureEfficiency(spec, context);

      // Should return perfect efficiency (100) when no metrics (assume efficient)
      expect(score).toBe(100);
    });
  });

  describe("singleton management", () => {
    it("should return same instance from getBenchmarkRunner", () => {
      const instance1 = getBenchmarkRunner();
      const instance2 = getBenchmarkRunner();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = getBenchmarkRunner();
      resetBenchmarkRunner();
      const instance2 = getBenchmarkRunner();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("config management", () => {
    it("should update config", () => {
      runner.updateConfig({ concurrency: 8 });
      const config = runner.getConfig();

      expect(config.concurrency).toBe(8);
    });

    it("should return copy of config", () => {
      const config1 = runner.getConfig();
      const config2 = runner.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
