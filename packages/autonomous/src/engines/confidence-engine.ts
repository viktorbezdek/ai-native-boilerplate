/**
 * Confidence Engine for calculating confidence scores for autonomous decisions.
 * Gathers signals from multiple sources and calculates weighted confidence.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ConfidenceDecision,
  ConfidenceEngineConfig,
  ConfidenceResult,
  ConfidenceSignal,
  ExecutionRecord,
  QualityMetrics,
  SignalSource,
} from "../types/confidence";
import {
  DEFAULT_CONFIDENCE_CONFIG,
  DEFAULT_SIGNAL_WEIGHTS,
} from "../types/confidence";

/**
 * Task interface for confidence calculation
 */
export interface TaskForConfidence {
  id: string;
  type: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedCost?: number;
  files?: string[];
}

/**
 * Confidence Engine for autonomous decision making
 */
export class ConfidenceEngine {
  private config: ConfidenceEngineConfig;

  constructor(config: Partial<ConfidenceEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIDENCE_CONFIG, ...config };
  }

  /**
   * Calculate confidence score for a task
   */
  async calculateConfidence(
    task: TaskForConfidence
  ): Promise<ConfidenceResult> {
    const signals = await this.gatherSignals(task);
    const score = this.calculateWeightedScore(signals);
    const decision = this.makeDecision(score);
    const reasoning = this.generateReasoning(signals, score, decision);

    return {
      score,
      signals,
      decision,
      reasoning,
      calculatedAt: new Date(),
    };
  }

  /**
   * Gather signals from all configured sources
   */
  async gatherSignals(task: TaskForConfidence): Promise<ConfidenceSignal[]> {
    const signals: ConfidenceSignal[] = [];
    const _now = new Date();

    // Gather test signals
    const testSignal = await this.gatherTestSignals();
    if (testSignal) {
      signals.push(testSignal);
    }

    // Gather lint signals
    const lintSignal = await this.gatherLintSignals();
    if (lintSignal) {
      signals.push(lintSignal);
    }

    // Gather build signals
    const buildSignal = await this.gatherBuildSignals();
    if (buildSignal) {
      signals.push(buildSignal);
    }

    // Gather historical signals
    const historySignal = await this.gatherHistorySignals(task.type);
    if (historySignal) {
      signals.push(historySignal);
    }

    // Gather benchmark signals if available
    const benchmarkSignal = await this.gatherBenchmarkSignals(task.type);
    if (benchmarkSignal) {
      signals.push(benchmarkSignal);
    }

    // Add review signal based on task priority
    const reviewSignal = this.createReviewSignal(task);
    signals.push(reviewSignal);

    return signals;
  }

  /**
   * Make decision based on confidence score
   */
  makeDecision(score: number): ConfidenceDecision {
    const { thresholds } = this.config;

    if (score >= thresholds.autoExecute) {
      return "auto-execute";
    }
    if (score >= thresholds.notify) {
      return "notify";
    }
    if (score >= thresholds.requireApproval) {
      return "require-approval";
    }
    return "escalate";
  }

  /**
   * Calculate weighted score from signals
   */
  private calculateWeightedScore(signals: ConfidenceSignal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    // Filter out stale signals
    const validSignals = signals.filter((s) => {
      const age = Date.now() - s.timestamp.getTime();
      return age <= this.config.maxSignalAge;
    });

    if (validSignals.length < this.config.minSignals) {
      // Not enough signals, return lower confidence
      return Math.min(
        50,
        validSignals.reduce((sum, s) => sum + s.value * s.weight, 0) /
          Math.max(
            1,
            validSignals.reduce((sum, s) => sum + s.weight, 0)
          )
      );
    }

    const totalWeight = validSignals.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = validSignals.reduce(
      (sum, s) => sum + s.value * s.weight,
      0
    );

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generate human-readable reasoning for the decision
   */
  private generateReasoning(
    signals: ConfidenceSignal[],
    score: number,
    decision: ConfidenceDecision
  ): string[] {
    const reasons: string[] = [];

    // Overall score reasoning
    reasons.push(`Overall confidence score: ${score}/100`);

    // Individual signal reasoning
    for (const signal of signals) {
      const status =
        signal.value >= 80
          ? "strong"
          : signal.value >= 60
            ? "moderate"
            : "weak";
      reasons.push(
        `${signal.source}: ${status} signal (${signal.value}/100, weight: ${signal.weight})`
      );
    }

    // Decision reasoning
    switch (decision) {
      case "auto-execute":
        reasons.push(
          "Recommendation: Auto-execute (high confidence from multiple sources)"
        );
        break;
      case "notify":
        reasons.push(
          "Recommendation: Proceed with notification (confidence above threshold)"
        );
        break;
      case "require-approval":
        reasons.push(
          "Recommendation: Require approval before proceeding (moderate confidence)"
        );
        break;
      case "escalate":
        reasons.push(
          "Recommendation: Escalate to human review (low confidence or missing signals)"
        );
        break;
    }

    return reasons;
  }

  /**
   * Gather signals from test results
   */
  private async gatherTestSignals(): Promise<ConfidenceSignal | null> {
    try {
      const qualityPath = path.join(this.config.logsPath, "quality.jsonl");
      const content = await fs.readFile(qualityPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      // Get most recent entry
      const latest = JSON.parse(lines[lines.length - 1] || "{}");

      if (!latest.tests) {
        return null;
      }

      const { passed = 0, total = 0, coverage = 0 } = latest.tests;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      // Combine pass rate and coverage for final value
      const value = Math.round(passRate * 0.6 + coverage * 0.4);

      return {
        source: "tests",
        value,
        weight: this.config.weights.tests,
        timestamp: new Date(latest.timestamp || Date.now()),
        metadata: { passRate, coverage, total },
      };
    } catch {
      return null;
    }
  }

  /**
   * Gather signals from lint results
   */
  private async gatherLintSignals(): Promise<ConfidenceSignal | null> {
    try {
      const qualityPath = path.join(this.config.logsPath, "quality.jsonl");
      const content = await fs.readFile(qualityPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      const latest = JSON.parse(lines[lines.length - 1] || "{}");

      if (!latest.lint) {
        return null;
      }

      const { errors = 0, warnings = 0 } = latest.lint;

      // Calculate value: 100 minus penalties for errors and warnings
      const value = Math.max(0, 100 - errors * 10 - warnings * 2);

      return {
        source: "lint",
        value,
        weight: this.config.weights.lint,
        timestamp: new Date(latest.timestamp || Date.now()),
        metadata: { errors, warnings },
      };
    } catch {
      return null;
    }
  }

  /**
   * Gather signals from build results
   */
  private async gatherBuildSignals(): Promise<ConfidenceSignal | null> {
    try {
      const qualityPath = path.join(this.config.logsPath, "quality.jsonl");
      const content = await fs.readFile(qualityPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      const latest = JSON.parse(lines[lines.length - 1] || "{}");

      if (latest.build === undefined) {
        return null;
      }

      const value = latest.build?.success ? 100 : 0;

      return {
        source: "build",
        value,
        weight: this.config.weights.build,
        timestamp: new Date(latest.timestamp || Date.now()),
        metadata: { success: latest.build?.success },
      };
    } catch {
      return null;
    }
  }

  /**
   * Gather signals from execution history
   */
  private async gatherHistorySignals(
    taskType: string
  ): Promise<ConfidenceSignal | null> {
    try {
      const executionsPath = path.join(
        this.config.logsPath,
        "executions.jsonl"
      );
      const content = await fs.readFile(executionsPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      // Get executions from last 7 days
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentExecutions: ExecutionRecord[] = [];

      for (const line of lines) {
        try {
          const record = JSON.parse(line);
          if (new Date(record.timestamp).getTime() > cutoff) {
            recentExecutions.push(record);
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (recentExecutions.length < 3) {
        return null;
      }

      // Calculate success rate
      const successCount = recentExecutions.filter((r) => r.success).length;
      const successRate = (successCount / recentExecutions.length) * 100;

      return {
        source: "history",
        value: Math.round(successRate),
        weight: this.config.weights.history,
        timestamp: new Date(),
        metadata: {
          total: recentExecutions.length,
          successful: successCount,
          taskType,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Gather signals from benchmark results
   */
  private async gatherBenchmarkSignals(
    _taskType: string
  ): Promise<ConfidenceSignal | null> {
    try {
      const benchmarkPath = path.join(
        this.config.logsPath,
        "benchmarks",
        "latest.json"
      );
      const content = await fs.readFile(benchmarkPath, "utf-8");
      const results = JSON.parse(content);

      if (!results.aggregateScore) {
        return null;
      }

      return {
        source: "benchmark",
        value: Math.round(results.aggregateScore),
        weight: this.config.weights.benchmark,
        timestamp: new Date(results.executedAt || Date.now()),
        metadata: { suiteId: results.suiteId },
      };
    } catch {
      return null;
    }
  }

  /**
   * Create review signal based on task priority and complexity
   */
  private createReviewSignal(task: TaskForConfidence): ConfidenceSignal {
    let value = 70; // Default moderate confidence

    // Adjust based on priority
    switch (task.priority) {
      case "critical":
        value -= 30;
        break;
      case "high":
        value -= 15;
        break;
      case "medium":
        value -= 5;
        break;
      case "low":
        value += 10;
        break;
    }

    // Adjust based on estimated cost
    if (task.estimatedCost) {
      if (task.estimatedCost > 100) {
        value -= 20;
      } else if (task.estimatedCost > 50) {
        value -= 10;
      }
    }

    // Adjust based on files affected
    if (task.files && task.files.length > 10) {
      value -= 15;
    } else if (task.files && task.files.length > 5) {
      value -= 5;
    }

    return {
      source: "review",
      value: Math.max(0, Math.min(100, value)),
      weight: this.config.weights.review,
      timestamp: new Date(),
      metadata: {
        priority: task.priority,
        estimatedCost: task.estimatedCost,
        filesCount: task.files?.length,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConfidenceEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfidenceEngineConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultEngine: ConfidenceEngine | null = null;

export function getConfidenceEngine(
  config?: Partial<ConfidenceEngineConfig>
): ConfidenceEngine {
  if (!defaultEngine) {
    defaultEngine = new ConfidenceEngine(config);
  }
  return defaultEngine;
}

export function resetConfidenceEngine(): void {
  defaultEngine = null;
}
