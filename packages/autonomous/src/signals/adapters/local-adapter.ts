/**
 * Local Signal Adapter
 * Reads signals from local log files and processes
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  AdapterHealth,
  Signal,
  SignalAdapter,
  SignalPriority,
  SignalType,
} from "../../types/signal";

/**
 * Configuration for local adapter
 */
export interface LocalAdapterConfig {
  logsPath: string;
  pollFiles: string[];
}

/**
 * Default local adapter config
 */
export const DEFAULT_LOCAL_ADAPTER_CONFIG: LocalAdapterConfig = {
  logsPath: ".claude/logs",
  pollFiles: ["quality.jsonl", "executions.jsonl", "drift.jsonl"],
};

/**
 * Local signal adapter that reads from log files
 */
export class LocalAdapter implements SignalAdapter {
  readonly source = "local" as const;
  private config: LocalAdapterConfig;
  private lastReadPositions: Map<string, number>;
  private signalsReceived: number;
  private lastError: string | undefined;
  private lastPoll: Date | undefined;

  constructor(config: Partial<LocalAdapterConfig> = {}) {
    this.config = { ...DEFAULT_LOCAL_ADAPTER_CONFIG, ...config };
    this.lastReadPositions = new Map();
    this.signalsReceived = 0;
    this.lastError = undefined;
    this.lastPoll = undefined;
  }

  /**
   * Poll for new signals from log files
   */
  async poll(): Promise<Signal[]> {
    const signals: Signal[] = [];
    this.lastPoll = new Date();

    for (const file of this.config.pollFiles) {
      try {
        const filePath = path.join(this.config.logsPath, file);
        const fileSignals = await this.readNewLines(filePath, file);
        signals.push(...fileSignals);
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }

    this.signalsReceived += signals.length;
    return signals;
  }

  /**
   * Read new lines from a log file
   */
  private async readNewLines(
    filePath: string,
    fileName: string
  ): Promise<Signal[]> {
    const signals: Signal[] = [];

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      const lastPosition = this.lastReadPositions.get(filePath) || 0;

      for (let i = lastPosition; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
          continue;
        }

        try {
          const data = JSON.parse(line);
          const signal = this.parseLogEntry(data, fileName);
          if (signal) {
            signals.push(signal);
          }
        } catch {
          // Skip malformed lines
        }
      }

      this.lastReadPositions.set(filePath, lines.length);
    } catch {
      // File doesn't exist yet
    }

    return signals;
  }

  /**
   * Parse a log entry into a signal
   */
  private parseLogEntry(
    data: Record<string, unknown>,
    source: string
  ): Signal | null {
    const now = new Date();

    // Quality.jsonl entries
    if (source === "quality.jsonl") {
      const tests = data.tests as Record<string, unknown> | undefined;
      const lint = data.lint as Record<string, unknown> | undefined;

      // Check for test failures
      if (tests && (tests.failed as number) > 0) {
        return {
          id: `local_${Date.now()}_test_failure`,
          type: "error",
          source: "local",
          priority: (tests.failed as number) > 5 ? "high" : "medium",
          timestamp: new Date((data.timestamp as string) || now),
          payload: { tests },
          tags: ["test", "failure"],
          processed: false,
        };
      }

      // Check for lint errors
      if (lint && (lint.errors as number) > 0) {
        return {
          id: `local_${Date.now()}_lint_errors`,
          type: "alert",
          source: "local",
          priority: (lint.errors as number) > 10 ? "high" : "low",
          timestamp: new Date((data.timestamp as string) || now),
          payload: { lint },
          tags: ["lint", "error"],
          processed: false,
        };
      }

      // Quality metric update
      return {
        id: `local_${Date.now()}_quality`,
        type: "metric",
        source: "local",
        priority: "low",
        timestamp: new Date((data.timestamp as string) || now),
        payload: data,
        tags: ["quality"],
        processed: false,
      };
    }

    // Executions.jsonl entries
    if (source === "executions.jsonl") {
      const success = data.success as boolean;

      if (!success) {
        return {
          id: `local_${Date.now()}_execution_failure`,
          type: "error",
          source: "local",
          priority: "medium",
          timestamp: new Date((data.timestamp as string) || now),
          payload: data,
          tags: ["execution", "failure"],
          processed: false,
        };
      }

      return {
        id: `local_${Date.now()}_execution`,
        type: "event",
        source: "local",
        priority: "low",
        timestamp: new Date((data.timestamp as string) || now),
        payload: data,
        tags: ["execution"],
        processed: false,
      };
    }

    // Drift.jsonl entries
    if (source === "drift.jsonl") {
      const score = data.score as number;

      if (score > 30) {
        return {
          id: `local_${Date.now()}_high_drift`,
          type: "alert",
          source: "local",
          priority: score > 50 ? "high" : "medium",
          timestamp: new Date((data.timestamp as string) || now),
          payload: { ...data, anomaly: true },
          tags: ["drift", "anomaly"],
          processed: false,
        };
      }

      return {
        id: `local_${Date.now()}_drift`,
        type: "metric",
        source: "local",
        priority: "low",
        timestamp: new Date((data.timestamp as string) || now),
        payload: data,
        tags: ["drift"],
        processed: false,
      };
    }

    return null;
  }

  /**
   * Test connection (always succeeds for local)
   */
  async testConnection(): Promise<boolean> {
    try {
      await fs.access(this.config.logsPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get adapter health
   */
  async getHealth(): Promise<AdapterHealth> {
    const healthy = await this.testConnection();

    return {
      source: "local",
      healthy,
      lastPoll: this.lastPoll,
      lastError: this.lastError,
      signalsReceived: this.signalsReceived,
      errorRate: this.lastError ? 0.1 : 0,
    };
  }

  /**
   * Reset read positions (for testing)
   */
  reset(): void {
    this.lastReadPositions.clear();
    this.signalsReceived = 0;
    this.lastError = undefined;
    this.lastPoll = undefined;
  }
}

// Factory function
export function createLocalAdapter(
  config?: Partial<LocalAdapterConfig>
): LocalAdapter {
  return new LocalAdapter(config);
}
