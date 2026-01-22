import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConfidenceEngine,
  type TaskForConfidence,
  getConfidenceEngine,
  resetConfidenceEngine,
} from "../confidence-engine";

describe("ConfidenceEngine", () => {
  let engine: ConfidenceEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfidenceEngine();
    engine = new ConfidenceEngine({ logsPath: "/nonexistent/path" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default config when none provided", () => {
      const defaultEngine = new ConfidenceEngine();
      const config = defaultEngine.getConfig();

      expect(config.thresholds.autoExecute).toBe(95);
      expect(config.thresholds.notify).toBe(80);
      expect(config.thresholds.requireApproval).toBe(60);
      expect(config.minSignals).toBe(3);
    });

    it("should merge custom config with defaults", () => {
      const customEngine = new ConfidenceEngine({
        thresholds: { autoExecute: 90, notify: 75, requireApproval: 50 },
      });
      const config = customEngine.getConfig();

      expect(config.thresholds.autoExecute).toBe(90);
      expect(config.thresholds.notify).toBe(75);
      expect(config.minSignals).toBe(3); // From defaults
    });
  });

  describe("makeDecision", () => {
    it("should return auto-execute for scores >= autoExecute threshold", () => {
      expect(engine.makeDecision(95)).toBe("auto-execute");
      expect(engine.makeDecision(100)).toBe("auto-execute");
    });

    it("should return notify for scores >= notify and < autoExecute", () => {
      expect(engine.makeDecision(80)).toBe("notify");
      expect(engine.makeDecision(94)).toBe("notify");
    });

    it("should return require-approval for scores >= requireApproval and < notify", () => {
      expect(engine.makeDecision(60)).toBe("require-approval");
      expect(engine.makeDecision(79)).toBe("require-approval");
    });

    it("should return escalate for scores < requireApproval", () => {
      expect(engine.makeDecision(0)).toBe("escalate");
      expect(engine.makeDecision(59)).toBe("escalate");
    });
  });

  describe("calculateConfidence", () => {
    const mockTask: TaskForConfidence = {
      id: "task-1",
      type: "feature",
      title: "Add new feature",
      priority: "medium",
    };

    it("should return confidence result with all required fields", async () => {
      const result = await engine.calculateConfidence(mockTask);

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("signals");
      expect(result).toHaveProperty("decision");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("calculatedAt");
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it("should include review signal based on task priority", async () => {
      const result = await engine.calculateConfidence(mockTask);
      const reviewSignal = result.signals.find((s) => s.source === "review");

      expect(reviewSignal).toBeDefined();
      expect(reviewSignal?.value).toBeLessThanOrEqual(100);
      expect(reviewSignal?.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe("gatherSignals", () => {
    const mockTask: TaskForConfidence = {
      id: "task-1",
      type: "feature",
      title: "Add new feature",
      priority: "low",
    };

    it("should always include review signal", async () => {
      const signals = await engine.gatherSignals(mockTask);
      const reviewSignal = signals.find((s) => s.source === "review");

      expect(reviewSignal).toBeDefined();
    });

    it("should handle missing log files gracefully", async () => {
      const signals = await engine.gatherSignals(mockTask);
      // Should not throw, and should still have review signal
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("review signal calculation", () => {
    it("should reduce confidence for critical priority tasks", async () => {
      const criticalTask: TaskForConfidence = {
        id: "task-1",
        type: "fix",
        title: "Critical fix",
        priority: "critical",
      };

      const result = await engine.calculateConfidence(criticalTask);
      const reviewSignal = result.signals.find((s) => s.source === "review");

      // Base 70 - 30 for critical = 40
      expect(reviewSignal?.value).toBe(40);
    });

    it("should increase confidence for low priority tasks", async () => {
      const lowTask: TaskForConfidence = {
        id: "task-1",
        type: "chore",
        title: "Minor chore",
        priority: "low",
      };

      const result = await engine.calculateConfidence(lowTask);
      const reviewSignal = result.signals.find((s) => s.source === "review");

      // Base 70 + 10 for low = 80
      expect(reviewSignal?.value).toBe(80);
    });

    it("should reduce confidence for high cost tasks", async () => {
      const highCostTask: TaskForConfidence = {
        id: "task-1",
        type: "feature",
        title: "Expensive feature",
        priority: "medium",
        estimatedCost: 150,
      };

      const result = await engine.calculateConfidence(highCostTask);
      const reviewSignal = result.signals.find((s) => s.source === "review");

      // Base 70 - 5 (medium) - 20 (cost > 100) = 45
      expect(reviewSignal?.value).toBe(45);
    });

    it("should reduce confidence for tasks affecting many files", async () => {
      const manyFilesTask: TaskForConfidence = {
        id: "task-1",
        type: "refactor",
        title: "Large refactor",
        priority: "medium",
        files: Array(15).fill("file.ts"),
      };

      const result = await engine.calculateConfidence(manyFilesTask);
      const reviewSignal = result.signals.find((s) => s.source === "review");

      // Base 70 - 5 (medium) - 15 (files > 10) = 50
      expect(reviewSignal?.value).toBe(50);
    });
  });

  describe("singleton management", () => {
    it("should return same instance from getConfidenceEngine", () => {
      const instance1 = getConfidenceEngine();
      const instance2 = getConfidenceEngine();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = getConfidenceEngine();
      resetConfidenceEngine();
      const instance2 = getConfidenceEngine();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("config management", () => {
    it("should update config", () => {
      engine.updateConfig({ minSignals: 5 });
      const config = engine.getConfig();

      expect(config.minSignals).toBe(5);
    });

    it("should return copy of config", () => {
      const config1 = engine.getConfig();
      const config2 = engine.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
