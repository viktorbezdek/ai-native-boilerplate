import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterHealth, Signal, SignalAdapter } from "../../types/signal";
import {
  BUILTIN_PATTERNS,
  SignalProcessor,
  getSignalProcessor,
  resetSignalProcessor,
} from "../signal-processor";

describe("SignalProcessor", () => {
  let processor: SignalProcessor;
  const mockLogsPath = "/tmp/test-signals";

  beforeEach(() => {
    vi.clearAllMocks();
    resetSignalProcessor();
    processor = new SignalProcessor({ logsPath: mockLogsPath });
  });

  afterEach(() => {
    processor.stop();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default config when none provided", () => {
      const defaultProcessor = new SignalProcessor();
      const config = defaultProcessor.getConfig();

      expect(config.pollInterval).toBe(30000);
      expect(config.batchSize).toBe(100);
    });

    it("should merge custom config with defaults", () => {
      const customProcessor = new SignalProcessor({
        pollInterval: 60000,
      });
      const config = customProcessor.getConfig();

      expect(config.pollInterval).toBe(60000);
      expect(config.batchSize).toBe(100); // From defaults
    });

    it("should include builtin patterns", () => {
      const patterns = processor.getPatterns();

      expect(patterns.length).toBeGreaterThanOrEqual(BUILTIN_PATTERNS.length);
    });
  });

  describe("adapter management", () => {
    it("should register adapter", async () => {
      const mockAdapter: SignalAdapter = {
        source: "local",
        poll: vi.fn().mockResolvedValue([]),
        getHealth: vi.fn().mockResolvedValue({
          source: "local",
          healthy: true,
          lastPoll: new Date(),
          errorCount: 0,
        }),
      };

      processor.registerAdapter(mockAdapter);

      // Adapter should be called when polling
      await processor.pollAllAdapters();
      expect(mockAdapter.poll).toHaveBeenCalled();
    });
  });

  describe("signal processing", () => {
    it("should add signals to buffer", async () => {
      const signal: Signal = {
        id: "signal-1",
        type: "event",
        source: "local",
        priority: "medium",
        timestamp: new Date(),
        payload: { message: "test" },
      };

      await processor.ingest(signal);

      const buffered = processor.getBufferedSignals();
      expect(buffered).toHaveLength(1);
      expect(buffered[0].id).toBe("signal-1");
    });

    it("should process signals through pattern matching", async () => {
      const consoleSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      // Add a simple test pattern
      processor.addPattern({
        id: "test-pattern",
        name: "Test Pattern",
        description: "Test",
        condition: (signals) => signals.some((s) => s.id === "trigger-signal"),
        action: { type: "log" },
        cooldown: 1000,
        enabled: true,
        priority: 1,
        tags: ["test"],
      });

      const signal: Signal = {
        id: "trigger-signal",
        type: "event",
        source: "local",
        priority: "medium",
        timestamp: new Date(),
        payload: {},
      };

      await processor.ingest(signal);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Pattern test-pattern matched")
      );

      consoleSpy.mockRestore();
    });

    it("should respect pattern cooldown", async () => {
      const consoleSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      processor.addPattern({
        id: "cooldown-pattern",
        name: "Cooldown Pattern",
        description: "Test cooldown",
        condition: () => true,
        action: { type: "log" },
        cooldown: 60000,
        enabled: true,
        priority: 1,
        tags: ["test"],
      });

      const signal: Signal = {
        id: "signal-1",
        type: "event",
        source: "local",
        priority: "medium",
        timestamp: new Date(),
        payload: {},
      };

      // First ingestion should trigger
      await processor.ingest(signal);
      const callCount1 = consoleSpy.mock.calls.length;

      // Second ingestion within cooldown should not trigger
      await processor.ingest({ ...signal, id: "signal-2" });
      const callCount2 = consoleSpy.mock.calls.length;

      expect(callCount1).toBe(callCount2);

      consoleSpy.mockRestore();
    });

    it("should accumulate signals in buffer via ingest", async () => {
      const customProcessor = new SignalProcessor({
        logsPath: mockLogsPath,
        batchSize: 5,
      });

      // Add signals via ingest (note: ingest doesn't trim, only pollAllAdapters does)
      for (let i = 0; i < 5; i++) {
        await customProcessor.ingest({
          id: `signal-${i}`,
          type: "event",
          source: "local",
          priority: "medium",
          timestamp: new Date(),
          payload: {},
        });
      }

      const buffered = customProcessor.getBufferedSignals();
      expect(buffered.length).toBe(5);
    });
  });

  describe("pattern management", () => {
    it("should add custom pattern", () => {
      const initialCount = processor.getPatterns().length;

      processor.addPattern({
        id: "custom-pattern",
        name: "Custom",
        description: "Test",
        condition: () => false,
        action: { type: "log" },
        cooldown: 1000,
        enabled: true,
        priority: 1,
        tags: [],
      });

      expect(processor.getPatterns().length).toBe(initialCount + 1);
    });

    it("should remove pattern by id", () => {
      processor.addPattern({
        id: "removable-pattern",
        name: "Removable",
        description: "Test",
        condition: () => false,
        action: { type: "log" },
        cooldown: 1000,
        enabled: true,
        priority: 1,
        tags: [],
      });

      const countBefore = processor.getPatterns().length;
      processor.removePattern("removable-pattern");
      const countAfter = processor.getPatterns().length;

      expect(countAfter).toBe(countBefore - 1);
      expect(
        processor.getPatterns().find((p) => p.id === "removable-pattern")
      ).toBeUndefined();
    });

    it("should enable/disable pattern", () => {
      processor.addPattern({
        id: "toggleable-pattern",
        name: "Toggleable",
        description: "Test",
        condition: () => false,
        action: { type: "log" },
        cooldown: 1000,
        enabled: true,
        priority: 1,
        tags: [],
      });

      processor.setPatternEnabled("toggleable-pattern", false);

      const pattern = processor
        .getPatterns()
        .find((p) => p.id === "toggleable-pattern");
      expect(pattern?.enabled).toBe(false);
    });
  });

  describe("metrics", () => {
    it("should return metrics for recent signals", async () => {
      const now = new Date();

      await processor.ingest({
        id: "signal-1",
        type: "error",
        source: "sentry",
        priority: "high",
        timestamp: now,
        payload: {},
      });

      await processor.ingest({
        id: "signal-2",
        type: "metric",
        source: "posthog",
        priority: "low",
        timestamp: now,
        payload: {},
      });

      const metrics = processor.getMetrics();

      expect(metrics.total).toBe(2);
      expect(metrics.byType.error).toBe(1);
      expect(metrics.byType.metric).toBe(1);
      expect(metrics.bySource.sentry).toBe(1);
      expect(metrics.bySource.posthog).toBe(1);
      expect(metrics.byPriority.high).toBe(1);
      expect(metrics.byPriority.low).toBe(1);
    });
  });

  describe("adapter health", () => {
    it("should return health status for all adapters", async () => {
      const mockHealth: AdapterHealth = {
        source: "local",
        healthy: true,
        lastPoll: new Date(),
        errorCount: 0,
      };

      const mockAdapter: SignalAdapter = {
        source: "local",
        poll: vi.fn().mockResolvedValue([]),
        getHealth: vi.fn().mockResolvedValue(mockHealth),
      };

      processor.registerAdapter(mockAdapter);

      const health = await processor.getAdapterHealth();

      expect(health).toHaveLength(1);
      expect(health[0]).toEqual(mockHealth);
    });
  });

  describe("lifecycle", () => {
    it("should start and perform initial poll", async () => {
      const mockAdapter: SignalAdapter = {
        source: "local",
        poll: vi.fn().mockResolvedValue([]),
        getHealth: vi.fn().mockResolvedValue({
          source: "local",
          healthy: true,
          lastPoll: new Date(),
          errorCount: 0,
        }),
      };

      processor.registerAdapter(mockAdapter);
      await processor.start();

      // Initial poll should happen on start
      expect(mockAdapter.poll).toHaveBeenCalledTimes(1);

      processor.stop();
    });

    it("should not start twice", async () => {
      const mockAdapter: SignalAdapter = {
        source: "local",
        poll: vi.fn().mockResolvedValue([]),
        getHealth: vi.fn().mockResolvedValue({
          source: "local",
          healthy: true,
          lastPoll: new Date(),
          errorCount: 0,
        }),
      };

      processor.registerAdapter(mockAdapter);
      await processor.start();
      await processor.start();

      // Should only poll once even with two start calls
      expect(mockAdapter.poll).toHaveBeenCalledTimes(1);

      processor.stop();
    });
  });

  describe("buffer management", () => {
    it("should clear buffer", async () => {
      await processor.ingest({
        id: "signal-1",
        type: "event",
        source: "local",
        priority: "medium",
        timestamp: new Date(),
        payload: {},
      });

      expect(processor.getBufferedSignals().length).toBe(1);

      processor.clearBuffer();

      expect(processor.getBufferedSignals().length).toBe(0);
    });
  });

  describe("singleton management", () => {
    it("should return same instance from getSignalProcessor", () => {
      const instance1 = getSignalProcessor();
      const instance2 = getSignalProcessor();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = getSignalProcessor();
      resetSignalProcessor();
      const instance2 = getSignalProcessor();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("config management", () => {
    it("should update config", () => {
      processor.updateConfig({ batchSize: 200 });
      const config = processor.getConfig();

      expect(config.batchSize).toBe(200);
    });

    it("should allow config update while running", async () => {
      const mockAdapter: SignalAdapter = {
        source: "local",
        poll: vi.fn().mockResolvedValue([]),
        getHealth: vi.fn().mockResolvedValue({
          source: "local",
          healthy: true,
          lastPoll: new Date(),
          errorCount: 0,
        }),
      };

      processor.registerAdapter(mockAdapter);
      await processor.start();

      // Update poll interval while running
      processor.updateConfig({ pollInterval: 60000 });

      // Verify config was updated
      expect(processor.getConfig().pollInterval).toBe(60000);

      processor.stop();
    });
  });
});

describe("BUILTIN_PATTERNS", () => {
  it("should have high-error-rate pattern", () => {
    const pattern = BUILTIN_PATTERNS.find((p) => p.id === "high-error-rate");
    expect(pattern).toBeDefined();
    expect(pattern?.action.type).toBe("spawn-agent");
    expect(pattern?.action.agentType).toBe("responder");
  });

  it("should have deployment-failure pattern", () => {
    const pattern = BUILTIN_PATTERNS.find((p) => p.id === "deployment-failure");
    expect(pattern).toBeDefined();
    expect(pattern?.action.type).toBe("spawn-agent");
    expect(pattern?.action.agentType).toBe("deployer");
  });

  it("should have feature-flag-anomaly pattern", () => {
    const pattern = BUILTIN_PATTERNS.find(
      (p) => p.id === "feature-flag-anomaly"
    );
    expect(pattern).toBeDefined();
    expect(pattern?.action.type).toBe("notify");
  });

  it("high-error-rate pattern should trigger on 5+ error signals", () => {
    const pattern = BUILTIN_PATTERNS.find((p) => p.id === "high-error-rate");

    const errorSignals: Signal[] = Array(5)
      .fill(null)
      .map((_, i) => ({
        id: `error-${i}`,
        type: "error" as const,
        source: "sentry" as const,
        priority: "high" as const,
        timestamp: new Date(),
        payload: {},
      }));

    expect(pattern?.condition(errorSignals)).toBe(true);
    expect(pattern?.condition(errorSignals.slice(0, 4))).toBe(false);
  });

  it("deployment-failure pattern should trigger on vercel failure event", () => {
    const pattern = BUILTIN_PATTERNS.find((p) => p.id === "deployment-failure");

    const failureSignal: Signal = {
      id: "deploy-1",
      type: "event",
      source: "vercel",
      priority: "critical",
      timestamp: new Date(),
      payload: { status: "failure" },
    };

    expect(pattern?.condition([failureSignal])).toBe(true);
    expect(
      pattern?.condition([{ ...failureSignal, payload: { status: "success" } }])
    ).toBe(false);
  });
});
