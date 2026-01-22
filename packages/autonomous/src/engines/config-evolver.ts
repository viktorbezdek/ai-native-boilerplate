/**
 * Configuration Evolver for self-improving the autonomous system.
 * Applies and validates configuration proposals from the learning engine.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ConfigEvolverConfig,
  ConfigProposal,
  EvolutionResult,
} from "../types/learning";
import { DEFAULT_EVOLVER_CONFIG } from "../types/learning";

/**
 * Configuration snapshot for tracking changes
 */
interface ConfigSnapshot {
  id: string;
  target: string;
  value: unknown;
  timestamp: Date;
}

/**
 * Active experiment tracking
 */
interface ActiveExperiment {
  proposal: ConfigProposal;
  appliedAt: Date;
  previousValue: unknown;
  baselineMetrics: Record<string, number>;
  evaluationScheduled: Date;
}

/**
 * Configuration Evolver for the autonomous system
 */
export class ConfigEvolver {
  private config: ConfigEvolverConfig;
  private activeExperiments: Map<string, ActiveExperiment>;
  private configSnapshots: ConfigSnapshot[];
  private evolutionResults: EvolutionResult[];
  private storePath: string;

  constructor(config: Partial<ConfigEvolverConfig> = {}) {
    this.config = { ...DEFAULT_EVOLVER_CONFIG, ...config };
    this.activeExperiments = new Map();
    this.configSnapshots = [];
    this.evolutionResults = [];
    this.storePath = ".claude/logs/evolution";
  }

  /**
   * Apply a configuration proposal
   */
  async applyProposal(proposal: ConfigProposal): Promise<EvolutionResult> {
    // Check concurrent experiment limit
    if (this.activeExperiments.size >= this.config.maxConcurrentExperiments) {
      return {
        proposalId: proposal.id,
        applied: false,
        notes: ["Maximum concurrent experiments reached"],
      };
    }

    // Check if already experimenting with same target
    for (const experiment of this.activeExperiments.values()) {
      if (experiment.proposal.target === proposal.target) {
        return {
          proposalId: proposal.id,
          applied: false,
          notes: [`Active experiment exists for target: ${proposal.target}`],
        };
      }
    }

    // Save snapshot of current value
    const snapshot: ConfigSnapshot = {
      id: `snap_${Date.now()}`,
      target: proposal.target,
      value: proposal.currentValue,
      timestamp: new Date(),
    };
    this.configSnapshots.push(snapshot);

    // Apply the change
    await this.applyConfig(proposal.target, proposal.proposedValue);

    // Capture baseline metrics
    const baselineMetrics = await this.captureMetrics();

    // Create experiment record
    const experiment: ActiveExperiment = {
      proposal,
      appliedAt: new Date(),
      previousValue: proposal.currentValue,
      baselineMetrics,
      evaluationScheduled: new Date(Date.now() + this.config.observationPeriod),
    };
    this.activeExperiments.set(proposal.id, experiment);

    const result: EvolutionResult = {
      proposalId: proposal.id,
      applied: true,
      appliedAt: new Date(),
      notes: [
        `Applied ${proposal.target} change`,
        `Evaluation scheduled for ${experiment.evaluationScheduled.toISOString()}`,
      ],
    };

    await this.saveState();

    return result;
  }

  /**
   * Evaluate an active experiment
   */
  async evaluateExperiment(proposalId: string): Promise<EvolutionResult> {
    const experiment = this.activeExperiments.get(proposalId);
    if (!experiment) {
      return {
        proposalId,
        applied: false,
        notes: ["Experiment not found"],
      };
    }

    // Capture current metrics
    const currentMetrics = await this.captureMetrics();

    // Calculate impact
    const actualImpact: EvolutionResult["actualImpact"] = [];

    for (const expected of experiment.proposal.expectedImpact) {
      const beforeValue =
        experiment.baselineMetrics[expected.metric] || expected.currentValue;
      const afterValue =
        currentMetrics[expected.metric] || expected.expectedValue;

      const improvement =
        beforeValue > 0 ? ((afterValue - beforeValue) / beforeValue) * 100 : 0;

      actualImpact.push({
        metric: expected.metric,
        beforeValue,
        afterValue,
        improvement,
      });
    }

    // Determine verdict
    const positiveImpacts = actualImpact.filter(
      (i) => i.improvement >= this.config.minImprovementThreshold * 100
    );
    const negativeImpacts = actualImpact.filter((i) => i.improvement < -5); // 5% regression

    let verdict: "keep" | "rollback" = "keep";
    const notes: string[] = [];

    if (negativeImpacts.length > 0 && this.config.autoRollback) {
      verdict = "rollback";
      notes.push(
        `Detected regression in: ${negativeImpacts.map((i) => i.metric).join(", ")}`
      );
    } else if (positiveImpacts.length === 0) {
      verdict = "rollback";
      notes.push("No significant improvement observed");
    } else {
      notes.push(
        `Positive impact in: ${positiveImpacts.map((i) => i.metric).join(", ")}`
      );
    }

    // Execute verdict
    if (verdict === "rollback") {
      await this.rollbackConfig(
        experiment.proposal.target,
        experiment.previousValue
      );
      notes.push("Configuration rolled back to previous value");
    }

    // Remove from active experiments
    this.activeExperiments.delete(proposalId);

    const result: EvolutionResult = {
      proposalId,
      applied: true,
      actualImpact,
      verdict,
      appliedAt: experiment.appliedAt,
      evaluatedAt: new Date(),
      notes,
    };

    this.evolutionResults.push(result);
    await this.saveState();

    return result;
  }

  /**
   * Check and evaluate due experiments
   */
  async checkExperiments(): Promise<EvolutionResult[]> {
    const results: EvolutionResult[] = [];
    const now = new Date();

    for (const [proposalId, experiment] of this.activeExperiments) {
      if (experiment.evaluationScheduled <= now) {
        const result = await this.evaluateExperiment(proposalId);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Apply configuration change
   */
  private async applyConfig(target: string, value: unknown): Promise<void> {
    // In a real implementation, this would modify the actual configuration files
    // For now, we log and store the intended change

    console.log(`[ConfigEvolver] Applying ${target}:`, value);

    try {
      await fs.mkdir(this.storePath, { recursive: true });

      const configPath = path.join(this.storePath, "current-config.json");
      let currentConfig: Record<string, unknown> = {};

      try {
        const content = await fs.readFile(configPath, "utf-8");
        currentConfig = JSON.parse(content);
      } catch {
        // No existing config
      }

      currentConfig[target] = value;
      await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2));
    } catch (error) {
      console.error("Error applying config:", error);
      throw error;
    }
  }

  /**
   * Rollback configuration change
   */
  private async rollbackConfig(target: string, value: unknown): Promise<void> {
    console.log(`[ConfigEvolver] Rolling back ${target}:`, value);
    await this.applyConfig(target, value);
  }

  /**
   * Capture current metrics for comparison
   */
  private async captureMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    try {
      // Read from metrics.json
      const metricsPath = path.join(".claude/logs", "metrics.json");
      const content = await fs.readFile(metricsPath, "utf-8").catch(() => "{}");
      const data = JSON.parse(content);

      // Extract relevant metrics
      metrics.autonomous_execution_rate = data.autonomousExecutionRate || 0;
      metrics.success_rate = data.successRate || 0;
      metrics.false_positive_rate = data.falsePositiveRate || 0;
      metrics.mean_time_to_detection = data.meanTimeToDetection || 0;
    } catch {
      // Default metrics
      metrics.autonomous_execution_rate = 20;
      metrics.success_rate = 80;
    }

    return metrics;
  }

  /**
   * Save evolver state
   */
  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storePath, { recursive: true });

      const statePath = path.join(this.storePath, "evolver-state.json");
      const state = {
        activeExperiments: Array.from(this.activeExperiments.entries()).map(
          ([id, exp]) => ({
            id,
            ...exp,
            appliedAt: exp.appliedAt.toISOString(),
            evaluationScheduled: exp.evaluationScheduled.toISOString(),
          })
        ),
        evolutionResults: this.evolutionResults.map((r) => ({
          ...r,
          appliedAt: r.appliedAt?.toISOString(),
          evaluatedAt: r.evaluatedAt?.toISOString(),
        })),
        snapshots: this.configSnapshots.map((s) => ({
          ...s,
          timestamp: s.timestamp.toISOString(),
        })),
      };

      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("Error saving evolver state:", error);
    }
  }

  /**
   * Load evolver state
   */
  async loadState(): Promise<void> {
    try {
      const statePath = path.join(this.storePath, "evolver-state.json");
      const content = await fs.readFile(statePath, "utf-8");
      const state = JSON.parse(content);

      // Restore active experiments
      this.activeExperiments.clear();
      for (const exp of state.activeExperiments || []) {
        this.activeExperiments.set(exp.id, {
          proposal: exp.proposal,
          appliedAt: new Date(exp.appliedAt),
          previousValue: exp.previousValue,
          baselineMetrics: exp.baselineMetrics,
          evaluationScheduled: new Date(exp.evaluationScheduled),
        });
      }

      // Restore results
      this.evolutionResults = (state.evolutionResults || []).map(
        (r: Record<string, unknown>) => ({
          ...r,
          appliedAt: r.appliedAt ? new Date(r.appliedAt as string) : undefined,
          evaluatedAt: r.evaluatedAt
            ? new Date(r.evaluatedAt as string)
            : undefined,
        })
      );

      // Restore snapshots
      this.configSnapshots = (state.snapshots || []).map(
        (s: Record<string, unknown>) => ({
          ...s,
          timestamp: new Date(s.timestamp as string),
        })
      );
    } catch {
      // No state file
    }
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): Array<{
    proposalId: string;
    target: string;
    appliedAt: Date;
    evaluationScheduled: Date;
  }> {
    return Array.from(this.activeExperiments.entries()).map(([id, exp]) => ({
      proposalId: id,
      target: exp.proposal.target,
      appliedAt: exp.appliedAt,
      evaluationScheduled: exp.evaluationScheduled,
    }));
  }

  /**
   * Get evolution results history
   */
  getEvolutionHistory(limit = 20): EvolutionResult[] {
    return this.evolutionResults.slice(-limit);
  }

  /**
   * Get configuration snapshots
   */
  getSnapshots(target?: string): ConfigSnapshot[] {
    if (target) {
      return this.configSnapshots.filter((s) => s.target === target);
    }
    return [...this.configSnapshots];
  }

  /**
   * Force rollback to a snapshot
   */
  async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.configSnapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      return false;
    }

    await this.rollbackConfig(snapshot.target, snapshot.value);
    return true;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConfigEvolverConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfigEvolverConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultEvolver: ConfigEvolver | null = null;

export function getConfigEvolver(
  config?: Partial<ConfigEvolverConfig>
): ConfigEvolver {
  if (!defaultEvolver) {
    defaultEvolver = new ConfigEvolver(config);
  }
  return defaultEvolver;
}

export function resetConfigEvolver(): void {
  defaultEvolver = null;
}
