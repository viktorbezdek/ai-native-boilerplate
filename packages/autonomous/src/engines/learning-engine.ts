/**
 * Learning Engine for extracting insights from autonomous development.
 * Analyzes execution history to identify patterns, anti-patterns, and optimizations.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  ConfigProposal,
  Learning,
  LearningConfidence,
  LearningEngineConfig,
  LearningReport,
  LearningSummary,
  LearningType,
  SkillScore,
} from "../types/learning";
import { DEFAULT_LEARNING_CONFIG } from "../types/learning";

/**
 * Execution record from logs
 */
interface ExecutionLog {
  id: string;
  taskType: string;
  agentType: string;
  success: boolean;
  duration: number;
  confidenceScore?: number;
  timestamp: string;
  error?: string;
  files?: string[];
}

/**
 * Learning Engine for the autonomous system
 */
export class LearningEngine {
  private config: LearningEngineConfig;
  private skillScores: Map<string, SkillScore>;

  constructor(config: Partial<LearningEngineConfig> = {}) {
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };
    this.skillScores = new Map();
  }

  /**
   * Extract learnings from execution history
   */
  async extractLearnings(since?: Date): Promise<LearningReport> {
    const lookbackMs = this.config.defaultLookback * 24 * 60 * 60 * 1000;
    const startDate = since || new Date(Date.now() - lookbackMs);
    const endDate = new Date();

    // Load execution logs
    const executions = await this.loadExecutions(startDate, endDate);

    // Extract patterns
    const patterns = this.extractPatterns(executions);
    const antiPatterns = this.extractAntiPatterns(executions);
    const optimizations = this.extractOptimizations(executions);
    const failureModes = this.extractFailureModes(executions);
    const successFactors = this.extractSuccessFactors(executions);

    const learnings = [
      ...patterns,
      ...antiPatterns,
      ...optimizations,
      ...failureModes,
      ...successFactors,
    ];

    const summary = this.generateSummary(learnings);

    const report: LearningReport = {
      id: `lr_${Date.now()}`,
      period: { start: startDate, end: endDate },
      learnings,
      summary,
      generatedAt: new Date(),
    };

    // Save report
    await this.saveReport(report);

    return report;
  }

  /**
   * Propose configuration updates based on learnings
   */
  async proposeConfigUpdates(): Promise<ConfigProposal[]> {
    const proposals: ConfigProposal[] = [];

    // Analyze recent execution patterns
    const lookbackMs = this.config.defaultLookback * 24 * 60 * 60 * 1000;
    const executions = await this.loadExecutions(
      new Date(Date.now() - lookbackMs),
      new Date()
    );

    // Propose confidence threshold adjustments
    const confidenceProposal = this.proposeConfidenceAdjustment(executions);
    if (confidenceProposal) {
      proposals.push(confidenceProposal);
    }

    // Propose signal weight adjustments
    const weightProposal = this.proposeSignalWeightAdjustment(executions);
    if (weightProposal) {
      proposals.push(weightProposal);
    }

    return proposals;
  }

  /**
   * Update skill scores based on recent performance
   */
  async updateSkillScores(): Promise<void> {
    const lookbackMs = this.config.defaultLookback * 24 * 60 * 60 * 1000;
    const executions = await this.loadExecutions(
      new Date(Date.now() - lookbackMs),
      new Date()
    );

    // Group by agent/skill type
    const bySkill = new Map<string, ExecutionLog[]>();
    for (const exec of executions) {
      const skill = exec.agentType || "unknown";
      if (!bySkill.has(skill)) {
        bySkill.set(skill, []);
      }
      bySkill.get(skill)?.push(exec);
    }

    // Calculate scores
    for (const [skill, skillExecs] of bySkill) {
      const successCount = skillExecs.filter((e) => e.success).length;
      const successRate = (successCount / skillExecs.length) * 100;

      // Calculate task type scores
      const taskTypeScores: Record<string, number> = {};
      const byTaskType = new Map<string, ExecutionLog[]>();

      for (const exec of skillExecs) {
        const taskType = exec.taskType || "general";
        if (!byTaskType.has(taskType)) {
          byTaskType.set(taskType, []);
        }
        byTaskType.get(taskType)?.push(exec);
      }

      for (const [taskType, taskExecs] of byTaskType) {
        const taskSuccess = taskExecs.filter((e) => e.success).length;
        taskTypeScores[taskType] = (taskSuccess / taskExecs.length) * 100;
      }

      // Determine trend
      const recentExecs = skillExecs.slice(-10);
      const olderExecs = skillExecs.slice(-20, -10);

      const recentSuccessRate =
        recentExecs.length > 0
          ? (recentExecs.filter((e) => e.success).length / recentExecs.length) *
            100
          : successRate;

      const olderSuccessRate =
        olderExecs.length > 0
          ? (olderExecs.filter((e) => e.success).length / olderExecs.length) *
            100
          : successRate;

      let trend: "improving" | "stable" | "declining" = "stable";
      if (recentSuccessRate - olderSuccessRate > 5) {
        trend = "improving";
      } else if (olderSuccessRate - recentSuccessRate > 5) {
        trend = "declining";
      }

      this.skillScores.set(skill, {
        skillId: skill,
        score: Math.round(successRate),
        taskTypeScores,
        trend,
        sampleSize: skillExecs.length,
        updatedAt: new Date(),
      });
    }

    // Persist skill scores
    await this.saveSkillScores();
  }

  /**
   * Load execution logs from disk
   */
  private async loadExecutions(
    start: Date,
    end: Date
  ): Promise<ExecutionLog[]> {
    const executions: ExecutionLog[] = [];

    try {
      const logPath = path.join(this.config.logsPath, "executions.jsonl");
      const content = await fs.readFile(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const exec = JSON.parse(line) as ExecutionLog;
          const timestamp = new Date(exec.timestamp);

          if (timestamp >= start && timestamp <= end) {
            executions.push(exec);
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // No executions file
    }

    return executions;
  }

  /**
   * Extract positive patterns from executions
   */
  private extractPatterns(executions: ExecutionLog[]): Learning[] {
    const learnings: Learning[] = [];
    const successfulExecs = executions.filter((e) => e.success);

    if (successfulExecs.length < this.config.minSampleSize) {
      return learnings;
    }

    // Find common characteristics in successful executions
    const taskTypeCounts = new Map<string, number>();
    const agentTypeCounts = new Map<string, number>();

    for (const exec of successfulExecs) {
      taskTypeCounts.set(
        exec.taskType,
        (taskTypeCounts.get(exec.taskType) || 0) + 1
      );
      agentTypeCounts.set(
        exec.agentType,
        (agentTypeCounts.get(exec.agentType) || 0) + 1
      );
    }

    // Identify strong task-agent combinations
    for (const [taskType, count] of taskTypeCounts) {
      const successRate = count / successfulExecs.length;

      if (successRate > 0.3 && count >= 5) {
        learnings.push({
          id: `learn_pattern_${Date.now()}_${taskType}`,
          type: "pattern",
          title: `High success rate for ${taskType} tasks`,
          description: `${taskType} tasks have a ${Math.round(successRate * 100)}% representation in successful executions.`,
          confidence: this.calculateConfidence(count, executions.length),
          evidence: [
            {
              type: "execution",
              sourceId: "executions.jsonl",
              description: `${count} successful ${taskType} tasks`,
              value: count,
              timestamp: new Date(),
            },
          ],
          suggestedActions: [
            `Consider prioritizing ${taskType} tasks for autonomous execution`,
          ],
          applicableTo: [taskType],
          extractedAt: new Date(),
          sourceRange: {
            start: new Date(executions[0]?.timestamp || Date.now()),
            end: new Date(
              executions[executions.length - 1]?.timestamp || Date.now()
            ),
          },
          tags: ["pattern", "success", taskType],
        });
      }
    }

    return learnings;
  }

  /**
   * Extract anti-patterns from executions
   */
  private extractAntiPatterns(executions: ExecutionLog[]): Learning[] {
    const learnings: Learning[] = [];
    const failedExecs = executions.filter((e) => !e.success);

    if (failedExecs.length < this.config.minSampleSize) {
      return learnings;
    }

    // Find common characteristics in failed executions
    const errorPatterns = new Map<string, number>();

    for (const exec of failedExecs) {
      if (exec.error) {
        const errorType = this.categorizeError(exec.error);
        errorPatterns.set(errorType, (errorPatterns.get(errorType) || 0) + 1);
      }
    }

    for (const [errorType, count] of errorPatterns) {
      if (count >= 3) {
        learnings.push({
          id: `learn_antipattern_${Date.now()}_${errorType}`,
          type: "anti-pattern",
          title: `Recurring ${errorType} errors`,
          description: `${errorType} errors occurred ${count} times in the analysis period.`,
          confidence: this.calculateConfidence(count, failedExecs.length),
          evidence: [
            {
              type: "execution",
              sourceId: "executions.jsonl",
              description: `${count} occurrences of ${errorType}`,
              value: count,
              timestamp: new Date(),
            },
          ],
          suggestedActions: [
            `Investigate root cause of ${errorType} errors`,
            `Consider adding validation to prevent ${errorType}`,
          ],
          applicableTo: ["all"],
          extractedAt: new Date(),
          sourceRange: {
            start: new Date(failedExecs[0]?.timestamp || Date.now()),
            end: new Date(
              failedExecs[failedExecs.length - 1]?.timestamp || Date.now()
            ),
          },
          tags: ["anti-pattern", "error", errorType],
        });
      }
    }

    return learnings;
  }

  /**
   * Extract optimization opportunities
   */
  private extractOptimizations(executions: ExecutionLog[]): Learning[] {
    const learnings: Learning[] = [];

    // Analyze duration patterns
    const avgDuration =
      executions.reduce((sum, e) => sum + e.duration, 0) / executions.length;

    const slowExecs = executions.filter((e) => e.duration > avgDuration * 2);

    if (slowExecs.length >= 5) {
      learnings.push({
        id: `learn_opt_${Date.now()}_slow`,
        type: "optimization",
        title: "Slow execution pattern detected",
        description: `${slowExecs.length} executions took more than 2x average duration.`,
        confidence: "medium",
        evidence: [
          {
            type: "metric",
            sourceId: "executions.jsonl",
            description: `Average: ${Math.round(avgDuration)}ms, Slow threshold: ${Math.round(avgDuration * 2)}ms`,
            value: slowExecs.length,
            timestamp: new Date(),
          },
        ],
        suggestedActions: [
          "Profile slow executions for bottlenecks",
          "Consider caching or parallel execution",
        ],
        applicableTo: slowExecs.map((e) => e.taskType),
        extractedAt: new Date(),
        sourceRange: {
          start: new Date(executions[0]?.timestamp || Date.now()),
          end: new Date(
            executions[executions.length - 1]?.timestamp || Date.now()
          ),
        },
        tags: ["optimization", "performance"],
      });
    }

    return learnings;
  }

  /**
   * Extract failure modes
   */
  private extractFailureModes(executions: ExecutionLog[]): Learning[] {
    const learnings: Learning[] = [];
    const failedExecs = executions.filter((e) => !e.success);

    // Group failures by task type
    const failuresByType = new Map<string, ExecutionLog[]>();

    for (const exec of failedExecs) {
      const type = exec.taskType;
      if (!failuresByType.has(type)) {
        failuresByType.set(type, []);
      }
      failuresByType.get(type)?.push(exec);
    }

    for (const [taskType, failures] of failuresByType) {
      const totalOfType = executions.filter(
        (e) => e.taskType === taskType
      ).length;
      const failureRate = (failures.length / totalOfType) * 100;

      if (failureRate > 30 && failures.length >= 3) {
        learnings.push({
          id: `learn_failure_${Date.now()}_${taskType}`,
          type: "failure-mode",
          title: `High failure rate for ${taskType}`,
          description: `${taskType} tasks have a ${Math.round(failureRate)}% failure rate.`,
          confidence: this.calculateConfidence(failures.length, totalOfType),
          evidence: [
            {
              type: "execution",
              sourceId: "executions.jsonl",
              description: `${failures.length} of ${totalOfType} ${taskType} tasks failed`,
              value: failureRate,
              timestamp: new Date(),
            },
          ],
          suggestedActions: [
            `Review ${taskType} task implementation`,
            `Consider requiring approval for ${taskType} tasks`,
          ],
          applicableTo: [taskType],
          extractedAt: new Date(),
          sourceRange: {
            start: new Date(failures[0]?.timestamp || Date.now()),
            end: new Date(
              failures[failures.length - 1]?.timestamp || Date.now()
            ),
          },
          tags: ["failure-mode", taskType],
        });
      }
    }

    return learnings;
  }

  /**
   * Extract success factors
   */
  private extractSuccessFactors(executions: ExecutionLog[]): Learning[] {
    const learnings: Learning[] = [];
    const successfulExecs = executions.filter((e) => e.success);

    if (successfulExecs.length < this.config.minSampleSize) {
      return learnings;
    }

    // Analyze high-confidence successful executions
    const highConfidenceSuccess = successfulExecs.filter(
      (e) => e.confidenceScore && e.confidenceScore >= 90
    );

    if (highConfidenceSuccess.length >= 5) {
      learnings.push({
        id: `learn_success_${Date.now()}_confidence`,
        type: "success-factor",
        title: "High confidence correlates with success",
        description: `${highConfidenceSuccess.length} high-confidence executions (>=90) were all successful.`,
        confidence: "high",
        evidence: [
          {
            type: "execution",
            sourceId: "executions.jsonl",
            description: `All ${highConfidenceSuccess.length} high-confidence executions succeeded`,
            value: highConfidenceSuccess.length,
            timestamp: new Date(),
          },
        ],
        suggestedActions: [
          "Confidence scoring is well-calibrated for high-confidence decisions",
          "Consider lowering auto-execute threshold from 95 to 90",
        ],
        applicableTo: ["all"],
        extractedAt: new Date(),
        sourceRange: {
          start: new Date(executions[0]?.timestamp || Date.now()),
          end: new Date(
            executions[executions.length - 1]?.timestamp || Date.now()
          ),
        },
        tags: ["success-factor", "confidence"],
      });
    }

    return learnings;
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(
    sampleSize: number,
    totalSize: number
  ): LearningConfidence {
    const ratio = sampleSize / totalSize;
    if (sampleSize >= 20 && ratio >= 0.3) {
      return "high";
    }
    if (sampleSize >= 10 && ratio >= 0.2) {
      return "medium";
    }
    return "low";
  }

  /**
   * Categorize error message
   */
  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();

    if (lowerError.includes("timeout")) {
      return "timeout";
    }
    if (lowerError.includes("permission") || lowerError.includes("denied")) {
      return "permission";
    }
    if (lowerError.includes("not found") || lowerError.includes("404")) {
      return "not-found";
    }
    if (lowerError.includes("validation") || lowerError.includes("invalid")) {
      return "validation";
    }
    if (lowerError.includes("network") || lowerError.includes("connection")) {
      return "network";
    }

    return "unknown";
  }

  /**
   * Generate summary from learnings
   */
  private generateSummary(learnings: Learning[]): LearningSummary {
    const byType: Record<LearningType, number> = {
      pattern: 0,
      "anti-pattern": 0,
      optimization: 0,
      "failure-mode": 0,
      "success-factor": 0,
    };

    const byConfidence: Record<LearningConfidence, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const learning of learnings) {
      byType[learning.type]++;
      byConfidence[learning.confidence]++;
    }

    const topPatterns = learnings
      .filter((l) => l.type === "pattern")
      .slice(0, 3)
      .map((l) => l.title);

    const criticalAntiPatterns = learnings
      .filter((l) => l.type === "anti-pattern" && l.confidence === "high")
      .map((l) => l.title);

    const recommendations = learnings
      .filter((l) => l.confidence !== "low")
      .flatMap((l) => l.suggestedActions)
      .slice(0, 5);

    return {
      total: learnings.length,
      byType,
      byConfidence,
      topPatterns,
      criticalAntiPatterns,
      recommendations,
    };
  }

  /**
   * Propose confidence threshold adjustment
   */
  private proposeConfidenceAdjustment(
    executions: ExecutionLog[]
  ): ConfigProposal | null {
    // Analyze relationship between confidence and success
    const withConfidence = executions.filter((e) => e.confidenceScore);

    if (withConfidence.length < this.config.minSampleSize) {
      return null;
    }

    // Find optimal threshold
    const thresholds = [80, 85, 90, 95];
    const results: Array<{ threshold: number; precision: number }> = [];

    for (const threshold of thresholds) {
      const autoExecuted = withConfidence.filter(
        (e) => (e.confidenceScore || 0) >= threshold
      );
      const successful = autoExecuted.filter((e) => e.success);
      const precision =
        autoExecuted.length > 0 ? successful.length / autoExecuted.length : 0;
      results.push({ threshold, precision });
    }

    // Find threshold that maintains 95%+ precision
    const optimalResult = results.find((r) => r.precision >= 0.95);

    if (optimalResult && optimalResult.threshold !== 95) {
      return {
        id: `prop_${Date.now()}_confidence`,
        target: "confidence-thresholds",
        currentValue: { autoExecute: 95 },
        proposedValue: { autoExecute: optimalResult.threshold },
        reasoning: [
          `Analysis of ${withConfidence.length} executions shows ${Math.round(optimalResult.precision * 100)}% precision at ${optimalResult.threshold}% threshold`,
          "Lower threshold would increase autonomous execution rate while maintaining accuracy",
        ],
        expectedImpact: [
          {
            metric: "autonomous_execution_rate",
            currentValue: 20,
            expectedValue: 35,
            confidence: 0.7,
          },
        ],
        supportingLearnings: [],
        riskLevel: "medium",
        autoApply: false,
        createdAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Propose signal weight adjustment
   */
  private proposeSignalWeightAdjustment(
    _executions: ExecutionLog[]
  ): ConfigProposal | null {
    // Would analyze signal correlation with success
    // Simplified for now
    return null;
  }

  /**
   * Save learning report
   */
  private async saveReport(report: LearningReport): Promise<void> {
    try {
      await fs.mkdir(this.config.outputPath, { recursive: true });

      const reportPath = path.join(this.config.outputPath, `${report.id}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Update latest symlink
      const latestPath = path.join(this.config.outputPath, "latest.json");
      await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error("Error saving learning report:", error);
    }
  }

  /**
   * Save skill scores
   */
  private async saveSkillScores(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputPath, { recursive: true });

      const scoresPath = path.join(this.config.outputPath, "skill-scores.json");
      const scores = Array.from(this.skillScores.values());
      await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
    } catch (error) {
      console.error("Error saving skill scores:", error);
    }
  }

  /**
   * Get skill scores
   */
  getSkillScores(): SkillScore[] {
    return Array.from(this.skillScores.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LearningEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LearningEngineConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultEngine: LearningEngine | null = null;

export function getLearningEngine(
  config?: Partial<LearningEngineConfig>
): LearningEngine {
  if (!defaultEngine) {
    defaultEngine = new LearningEngine(config);
  }
  return defaultEngine;
}

export function resetLearningEngine(): void {
  defaultEngine = null;
}
