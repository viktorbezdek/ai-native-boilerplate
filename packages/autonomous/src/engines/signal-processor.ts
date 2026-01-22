/**
 * Signal Processor for the signal processing pipeline.
 * Ingests, aggregates, analyzes, and routes signals from multiple sources.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  AdapterHealth,
  PatternMatch,
  Signal,
  SignalAdapter,
  SignalMetrics,
  SignalPattern,
  SignalPriority,
  SignalProcessorConfig,
  SignalSourceType,
  SignalType,
} from "../types/signal";
import { DEFAULT_SIGNAL_PROCESSOR_CONFIG } from "../types/signal";

/**
 * Built-in signal patterns for common scenarios
 */
export const BUILTIN_PATTERNS: SignalPattern[] = [
  {
    id: "high-error-rate",
    name: "High Error Rate",
    description: "Triggers when error rate exceeds threshold",
    condition: (signals: Signal[]) => {
      const errorSignals = signals.filter(
        (s) => s.type === "error" && s.priority !== "low"
      );
      return errorSignals.length >= 5;
    },
    action: {
      type: "spawn-agent",
      agentType: "responder",
      params: {
        task: "Investigate high error rate and propose fixes",
      },
    },
    cooldown: 300000, // 5 minutes
    enabled: true,
    priority: 1,
    tags: ["error", "reliability"],
  },
  {
    id: "deployment-failure",
    name: "Deployment Failure",
    description: "Triggers on deployment failure events",
    condition: (signals: Signal[]) => {
      return signals.some(
        (s) =>
          s.type === "event" &&
          s.source === "vercel" &&
          (s.payload as Record<string, unknown>).status === "failure"
      );
    },
    action: {
      type: "spawn-agent",
      agentType: "deployer",
      params: {
        task: "Investigate deployment failure and rollback if necessary",
      },
    },
    cooldown: 60000, // 1 minute
    enabled: true,
    priority: 1,
    tags: ["deployment", "failure"],
  },
  {
    id: "feature-flag-anomaly",
    name: "Feature Flag Anomaly",
    description: "Triggers when feature flag shows unexpected behavior",
    condition: (signals: Signal[]) => {
      return signals.some(
        (s) =>
          s.type === "metric" &&
          s.source === "posthog" &&
          (s.payload as Record<string, unknown>).anomaly === true
      );
    },
    action: {
      type: "notify",
      notifyConfig: {
        channel: "alerts",
        message: "Feature flag anomaly detected - review recommended",
      },
    },
    cooldown: 600000, // 10 minutes
    enabled: true,
    priority: 2,
    tags: ["feature-flag", "anomaly"],
  },
];

/**
 * Signal Processor for the autonomous system
 */
export class SignalProcessor {
  private config: SignalProcessorConfig;
  private adapters: Map<SignalSourceType, SignalAdapter>;
  private patterns: SignalPattern[];
  private signalBuffer: Signal[];
  private lastPatternMatches: Map<string, number>; // pattern ID -> last match timestamp
  private isRunning: boolean;
  private pollTimer: ReturnType<typeof setInterval> | null;

  constructor(config: Partial<SignalProcessorConfig> = {}) {
    this.config = { ...DEFAULT_SIGNAL_PROCESSOR_CONFIG, ...config };
    this.adapters = new Map();
    this.patterns = [...BUILTIN_PATTERNS, ...this.config.patterns];
    this.signalBuffer = [];
    this.lastPatternMatches = new Map();
    this.isRunning = false;
    this.pollTimer = null;
  }

  /**
   * Register a signal adapter
   */
  registerAdapter(adapter: SignalAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  /**
   * Start the signal processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initial poll
    await this.pollAllAdapters();

    // Set up polling interval
    this.pollTimer = setInterval(
      () => this.pollAllAdapters(),
      this.config.pollInterval
    );
  }

  /**
   * Stop the signal processor
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Poll all registered adapters for new signals
   */
  async pollAllAdapters(): Promise<Signal[]> {
    const newSignals: Signal[] = [];

    for (const [source, adapter] of this.adapters) {
      try {
        const signals = await adapter.poll();
        newSignals.push(...signals);
      } catch (error) {
        console.error(`Error polling adapter ${source}:`, error);
      }
    }

    // Add to buffer
    this.signalBuffer.push(...newSignals);

    // Trim buffer to batch size
    if (this.signalBuffer.length > this.config.batchSize * 2) {
      this.signalBuffer = this.signalBuffer.slice(-this.config.batchSize);
    }

    // Process signals
    await this.processSignals(newSignals);

    return newSignals;
  }

  /**
   * Process new signals through the pipeline
   */
  async processSignals(signals: Signal[]): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    // Sort patterns by priority
    const sortedPatterns = [...this.patterns].sort(
      (a, b) => a.priority - b.priority
    );

    for (const pattern of sortedPatterns) {
      if (!pattern.enabled) {
        continue;
      }

      // Check cooldown
      const lastMatch = this.lastPatternMatches.get(pattern.id);
      if (lastMatch && Date.now() - lastMatch < pattern.cooldown) {
        continue;
      }

      // Evaluate pattern condition
      const recentSignals = this.getRecentSignals(pattern.cooldown);
      if (pattern.condition(recentSignals)) {
        const match: PatternMatch = {
          patternId: pattern.id,
          matchedSignals: recentSignals.filter((s) => !s.processed),
          matchedAt: new Date(),
          action: pattern.action,
        };

        matches.push(match);
        this.lastPatternMatches.set(pattern.id, Date.now());

        // Execute action
        await this.executeAction(match);

        // Mark signals as processed
        for (const signal of match.matchedSignals) {
          signal.processed = true;
        }
      }
    }

    // Persist signals
    await this.persistSignals(signals);

    return matches;
  }

  /**
   * Execute action from pattern match
   */
  private async executeAction(match: PatternMatch): Promise<void> {
    const { action } = match;

    switch (action.type) {
      case "spawn-agent":
        console.log(
          `[SignalProcessor] Would spawn ${action.agentType} agent for pattern ${match.patternId}`
        );
        // In real implementation, this would call the agent registry
        break;

      case "notify":
        console.log(
          `[SignalProcessor] Notification: ${action.notifyConfig?.message}`
        );
        break;

      case "create-task":
        console.log(
          `[SignalProcessor] Would create task: ${action.taskConfig?.title}`
        );
        break;

      case "trigger-workflow":
        console.log(
          `[SignalProcessor] Would trigger workflow: ${action.workflowId}`
        );
        break;

      case "escalate":
        console.log(
          `[SignalProcessor] Escalating pattern match: ${match.patternId}`
        );
        break;

      case "log":
        console.log(
          `[SignalProcessor] Log: Pattern ${match.patternId} matched`
        );
        break;
    }
  }

  /**
   * Get recent signals within time window
   */
  private getRecentSignals(windowMs: number): Signal[] {
    const cutoff = Date.now() - windowMs;
    return this.signalBuffer.filter((s) => s.timestamp.getTime() > cutoff);
  }

  /**
   * Persist signals to disk
   */
  private async persistSignals(signals: Signal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    try {
      await fs.mkdir(this.config.logsPath, { recursive: true });

      const logPath = path.join(this.config.logsPath, "signals.jsonl");
      const lines = signals
        .map((s) =>
          JSON.stringify({
            ...s,
            timestamp: s.timestamp.toISOString(),
          })
        )
        .join("\n");

      await fs.appendFile(logPath, `${lines}\n`);
    } catch (error) {
      console.error("Error persisting signals:", error);
    }
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: SignalPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove a pattern by ID
   */
  removePattern(patternId: string): void {
    this.patterns = this.patterns.filter((p) => p.id !== patternId);
  }

  /**
   * Enable/disable a pattern
   */
  setPatternEnabled(patternId: string, enabled: boolean): void {
    const pattern = this.patterns.find((p) => p.id === patternId);
    if (pattern) {
      pattern.enabled = enabled;
    }
  }

  /**
   * Get signal metrics
   */
  getMetrics(): SignalMetrics {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 3600000); // Last hour

    const recentSignals = this.signalBuffer.filter(
      (s) => s.timestamp >= windowStart
    );

    const byType: Record<SignalType, number> = {
      error: 0,
      metric: 0,
      event: 0,
      alert: 0,
    };

    const bySource: Record<SignalSourceType, number> = {
      sentry: 0,
      posthog: 0,
      vercel: 0,
      local: 0,
      github: 0,
      stripe: 0,
    };

    const byPriority: Record<SignalPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const signal of recentSignals) {
      byType[signal.type]++;
      bySource[signal.source]++;
      byPriority[signal.priority]++;
    }

    return {
      total: recentSignals.length,
      byType,
      bySource,
      byPriority,
      latency: {
        min: 0,
        max: 0,
        avg: 0,
        p95: 0,
      },
      window: {
        start: windowStart,
        end: now,
      },
    };
  }

  /**
   * Get adapter health status
   */
  async getAdapterHealth(): Promise<AdapterHealth[]> {
    const health: AdapterHealth[] = [];

    for (const [_source, adapter] of this.adapters) {
      const adapterHealth = await adapter.getHealth();
      health.push(adapterHealth);
    }

    return health;
  }

  /**
   * Manually ingest a signal
   */
  async ingest(signal: Signal): Promise<void> {
    this.signalBuffer.push(signal);
    await this.processSignals([signal]);
  }

  /**
   * Get all patterns
   */
  getPatterns(): SignalPattern[] {
    return [...this.patterns];
  }

  /**
   * Get buffered signals
   */
  getBufferedSignals(): Signal[] {
    return [...this.signalBuffer];
  }

  /**
   * Clear signal buffer
   */
  clearBuffer(): void {
    this.signalBuffer = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SignalProcessorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart polling if interval changed
    if (this.isRunning && config.pollInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SignalProcessorConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultProcessor: SignalProcessor | null = null;

export function getSignalProcessor(
  config?: Partial<SignalProcessorConfig>
): SignalProcessor {
  if (!defaultProcessor) {
    defaultProcessor = new SignalProcessor(config);
  }
  return defaultProcessor;
}

export function resetSignalProcessor(): void {
  if (defaultProcessor) {
    defaultProcessor.stop();
  }
  defaultProcessor = null;
}
