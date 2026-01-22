/**
 * Autonomous Orchestrator - The main closed-loop feedback system.
 * Coordinates: Sense → Analyze → Plan → Build → Verify → Deploy → Monitor → Learn → Evolve
 */

import type { BenchmarkResult } from "./types/benchmark";
import type { ConfidenceResult } from "./types/confidence";
import type { ConfigProposal, LearningReport } from "./types/learning";
import type {
  AnalysisResult,
  Anomaly,
  BuildResult,
  DeployResult,
  Learnings,
  LoopIteration,
  LoopPhase,
  MonitoringData,
  OrchestratorConfig,
  OrchestratorStatus,
  PatternAnalysis,
  PlanResult,
  PlannedTask,
  Recommendation,
  SenseResult,
  VerificationResult,
} from "./types/orchestrator";
import { DEFAULT_ORCHESTRATOR_CONFIG } from "./types/orchestrator";
import type { Signal, SignalMetrics } from "./types/signal";

import {
  type BenchmarkRunner,
  getBenchmarkRunner,
} from "./engines/benchmark-runner";
import {
  type ConfidenceEngine,
  getConfidenceEngine,
} from "./engines/confidence-engine";
import { type ConfigEvolver, getConfigEvolver } from "./engines/config-evolver";
import {
  type LearningEngine,
  getLearningEngine,
} from "./engines/learning-engine";
import {
  type SignalProcessor,
  getSignalProcessor,
} from "./engines/signal-processor";
import { type TriggerEngine, getTriggerEngine } from "./engines/trigger-engine";

/**
 * Autonomous Orchestrator for the self-developing system
 */
export class AutonomousOrchestrator {
  private config: OrchestratorConfig;
  private status: OrchestratorStatus;
  private currentPhase: LoopPhase;
  private currentIteration: LoopIteration | null;
  private iterations: LoopIteration[];
  private loopTimer: ReturnType<typeof setInterval> | null;

  // Engine references
  private confidenceEngine: ConfidenceEngine;
  private benchmarkRunner: BenchmarkRunner;
  private signalProcessor: SignalProcessor;
  private triggerEngine: TriggerEngine;
  private learningEngine: LearningEngine;
  private configEvolver: ConfigEvolver;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.status = "stopped";
    this.currentPhase = "idle";
    this.currentIteration = null;
    this.iterations = [];
    this.loopTimer = null;

    // Initialize engines
    this.confidenceEngine = getConfidenceEngine();
    this.benchmarkRunner = getBenchmarkRunner();
    this.signalProcessor = getSignalProcessor();
    this.triggerEngine = getTriggerEngine();
    this.learningEngine = getLearningEngine();
    this.configEvolver = getConfigEvolver();
  }

  /**
   * Start the autonomous orchestrator
   */
  async start(): Promise<void> {
    if (this.status === "running") {
      return;
    }

    this.status = "initializing";

    // Start all engines
    await this.signalProcessor.start();
    await this.triggerEngine.start();
    await this.configEvolver.loadState();

    this.status = "running";

    // Start the main loop
    this.loopTimer = setInterval(
      () => this.runLoop(),
      this.config.senseInterval
    );

    // Run initial loop
    await this.runLoop();
  }

  /**
   * Stop the autonomous orchestrator
   */
  stop(): void {
    this.status = "stopped";
    this.currentPhase = "idle";

    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }

    this.signalProcessor.stop();
    this.triggerEngine.stop();
  }

  /**
   * Pause the orchestrator
   */
  pause(): void {
    this.status = "paused";
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /**
   * Resume the orchestrator
   */
  resume(): void {
    if (this.status === "paused") {
      this.status = "running";
      this.loopTimer = setInterval(
        () => this.runLoop(),
        this.config.senseInterval
      );
    }
  }

  /**
   * Run one complete loop iteration
   */
  private async runLoop(): Promise<void> {
    if (this.status !== "running") {
      return;
    }

    const iteration: LoopIteration = {
      id: `iter_${Date.now()}`,
      startedAt: new Date(),
      phase: "sense",
      results: {},
      metrics: {
        totalDuration: 0,
        phasesDuration: {
          sense: 0,
          analyze: 0,
          plan: 0,
          build: 0,
          verify: 0,
          deploy: 0,
          monitor: 0,
          learn: 0,
          evolve: 0,
          idle: 0,
        },
        tasksExecuted: 0,
        confidenceAverage: 0,
        qualityScore: 0,
      },
    };

    this.currentIteration = iteration;

    try {
      // Sense
      iteration.results.sense = await this.sense();

      // Analyze
      if (iteration.results.sense.signals.length > 0) {
        iteration.results.analyze = await this.analyze(
          iteration.results.sense.signals
        );

        // Plan
        if (
          iteration.results.analyze.recommendations.length > 0 ||
          iteration.results.analyze.anomalies.length > 0
        ) {
          iteration.results.plan = await this.plan(iteration.results.analyze);

          // Build
          if (iteration.results.plan.tasks.length > 0 && !this.config.dryRun) {
            iteration.results.build = await this.build(
              iteration.results.plan.tasks
            );

            // Verify
            iteration.results.verify = await this.verify(
              iteration.results.build
            );

            // Deploy
            if (iteration.results.verify.overallPassed) {
              iteration.results.deploy = await this.deploy(
                iteration.results.verify
              );

              // Monitor
              if (iteration.results.deploy.success) {
                iteration.results.monitor = await this.monitor(
                  iteration.results.deploy
                );
              }
            }
          }
        }
      }

      // Learn (runs regardless of other phases)
      iteration.results.learn = await this.learn();

      // Evolve (if enabled)
      if (this.config.enableAutoEvolution) {
        await this.evolve(iteration.results.learn);
      }

      iteration.completedAt = new Date();
      iteration.metrics.totalDuration =
        iteration.completedAt.getTime() - iteration.startedAt.getTime();
    } catch (error) {
      iteration.error = error instanceof Error ? error.message : String(error);
      this.status = "error";
    }

    this.iterations.push(iteration);
    this.currentIteration = null;
    this.currentPhase = "idle";

    // Keep only last 100 iterations
    if (this.iterations.length > 100) {
      this.iterations = this.iterations.slice(-100);
    }
  }

  /**
   * SENSE: Gather signals from all sources
   */
  async sense(): Promise<SenseResult> {
    this.currentPhase = "sense";
    const signals = await this.signalProcessor.pollAllAdapters();
    const metrics = this.signalProcessor.getMetrics();

    return {
      signals,
      metrics,
      timestamp: new Date(),
    };
  }

  /**
   * ANALYZE: Detect patterns and anomalies
   */
  async analyze(signals: Signal[]): Promise<AnalysisResult> {
    this.currentPhase = "analyze";

    const patterns: PatternAnalysis[] = [];
    const anomalies: Anomaly[] = [];
    const recommendations: Recommendation[] = [];

    // Detect error patterns
    const errorSignals = signals.filter((s) => s.type === "error");
    if (errorSignals.length >= 3) {
      patterns.push({
        id: `pattern_${Date.now()}_errors`,
        type: "recurring",
        description: `${errorSignals.length} error signals detected`,
        confidence: 0.8,
        affectedSignals: errorSignals.map((s) => s.id),
        suggestedAction: "Investigate error sources",
      });

      recommendations.push({
        id: `rec_${Date.now()}_errors`,
        priority: "high",
        description: "High error rate detected",
        action: "Spawn responder agent to investigate",
        expectedImpact: "Reduce error rate",
      });
    }

    // Detect metric anomalies
    const metricSignals = signals.filter((s) => s.type === "metric");
    for (const signal of metricSignals) {
      const payload = signal.payload as Record<string, unknown>;
      if (payload.anomaly) {
        anomalies.push({
          id: `anomaly_${Date.now()}_${signal.id}`,
          type: "unexpected",
          severity: signal.priority === "critical" ? "critical" : "medium",
          description: `Anomaly in ${payload.metric || "unknown metric"}`,
          affectedMetrics: [String(payload.metric || "unknown")],
          detectedAt: signal.timestamp,
        });
      }
    }

    // Calculate overall health
    const errorRate =
      signals.length > 0 ? errorSignals.length / signals.length : 0;
    const overallHealth = Math.round((1 - errorRate) * 100);

    return {
      patterns,
      anomalies,
      recommendations,
      overallHealth,
      timestamp: new Date(),
    };
  }

  /**
   * PLAN: Create tasks based on analysis
   */
  async plan(analysis: AnalysisResult): Promise<PlanResult> {
    this.currentPhase = "plan";

    const tasks: PlannedTask[] = [];

    // Create tasks from recommendations
    for (const rec of analysis.recommendations) {
      const confidence = await this.confidenceEngine.calculateConfidence({
        id: `task_${Date.now()}`,
        type: "automated",
        title: rec.description,
        priority: rec.priority === "high" ? "high" : "medium",
      });

      tasks.push({
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: rec.description,
        description: rec.action,
        priority:
          rec.priority === "high"
            ? "high"
            : rec.priority === "medium"
              ? "medium"
              : "low",
        estimatedEffort: "M",
        dependencies: [],
        confidence,
        sourceAnalysis: rec.id,
      });
    }

    // Create tasks from anomalies
    for (const anomaly of analysis.anomalies) {
      if (anomaly.severity === "critical" || anomaly.severity === "high") {
        const confidence = await this.confidenceEngine.calculateConfidence({
          id: `task_${Date.now()}`,
          type: "incident",
          title: `Investigate: ${anomaly.description}`,
          priority: anomaly.severity === "critical" ? "critical" : "high",
        });

        tasks.push({
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: `Investigate: ${anomaly.description}`,
          description: `Anomaly detected: ${anomaly.type}`,
          priority: anomaly.severity === "critical" ? "critical" : "high",
          estimatedEffort: "S",
          dependencies: [],
          confidence,
          sourceAnalysis: anomaly.id,
        });
      }
    }

    // Calculate risk
    const highPriorityCount = tasks.filter(
      (t) => t.priority === "critical" || t.priority === "high"
    ).length;
    const overallRisk =
      highPriorityCount > 2 ? "high" : highPriorityCount > 0 ? "medium" : "low";

    return {
      tasks,
      estimatedDuration: tasks.length * 60000, // Rough estimate
      riskAssessment: {
        overallRisk,
        factors: [
          {
            factor: "High priority tasks",
            impact: highPriorityCount * 20,
            likelihood: 0.8,
          },
        ],
      },
      timestamp: new Date(),
    };
  }

  /**
   * BUILD: Execute planned tasks
   */
  async build(tasks: PlannedTask[]): Promise<BuildResult[]> {
    this.currentPhase = "build";

    const results: BuildResult[] = [];

    // Filter tasks by confidence threshold
    const autoExecuteTasks = tasks.filter(
      (t) => t.confidence.decision === "auto-execute"
    );

    // Execute tasks (simulated for now)
    for (const task of autoExecuteTasks.slice(
      0,
      this.config.buildConcurrency
    )) {
      const startTime = Date.now();

      // In real implementation, this would delegate to agents
      console.log(`[Orchestrator] Would execute task: ${task.title}`);

      results.push({
        taskId: task.id,
        success: true,
        artifacts: [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * VERIFY: Run tests and benchmarks
   */
  async verify(buildResults: BuildResult[]): Promise<VerificationResult> {
    this.currentPhase = "verify";

    // Run benchmarks if available
    let benchmarkResults: BenchmarkResult[] | undefined;
    // Would run benchmarks here

    return {
      buildResults,
      testResults: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: 0,
        duration: 0,
      },
      lintResults: {
        errors: 0,
        warnings: 0,
        fixed: 0,
        filesChecked: 0,
      },
      benchmarkResults,
      overallPassed: buildResults.every((r) => r.success),
      timestamp: new Date(),
    };
  }

  /**
   * DEPLOY: Deploy verified changes
   */
  async deploy(_verification: VerificationResult): Promise<DeployResult> {
    this.currentPhase = "deploy";

    // Check confidence threshold for deploy
    const avgConfidence = 80; // Would calculate from actual data

    if (avgConfidence < this.config.autoDeployThreshold) {
      return {
        environment: this.config.autoDeployEnvironment,
        success: false,
        version: "0.0.0",
        duration: 0,
        rollbackAvailable: false,
        timestamp: new Date(),
      };
    }

    // In real implementation, this would trigger actual deployment
    console.log(
      `[Orchestrator] Would deploy to ${this.config.autoDeployEnvironment}`
    );

    return {
      environment: this.config.autoDeployEnvironment,
      success: true,
      version: `0.0.${Date.now()}`,
      duration: 1000,
      rollbackAvailable: true,
      timestamp: new Date(),
    };
  }

  /**
   * MONITOR: Watch deployment health
   */
  async monitor(deployment: DeployResult): Promise<MonitoringData> {
    this.currentPhase = "monitor";

    // In real implementation, would observe for config.monitoringDuration
    return {
      deployment,
      healthChecks: [
        {
          name: "api",
          status: "healthy",
          latency: 50,
          lastChecked: new Date(),
        },
      ],
      errorRate: 0,
      latency: {
        p50: 50,
        p95: 100,
        p99: 200,
        max: 500,
      },
      userImpact: {
        affectedUsers: 0,
        errorCount: 0,
        featureUsage: {},
      },
      duration: this.config.monitoringDuration,
      timestamp: new Date(),
    };
  }

  /**
   * LEARN: Extract insights from execution
   */
  async learn(): Promise<Learnings> {
    this.currentPhase = "learn";

    const report = await this.learningEngine.extractLearnings();
    const proposals = await this.learningEngine.proposeConfigUpdates();
    await this.learningEngine.updateSkillScores();

    return {
      report,
      newPatterns: report.learnings.filter((l) => l.type === "pattern"),
      configProposals: proposals,
      timestamp: new Date(),
    };
  }

  /**
   * EVOLVE: Apply configuration improvements
   */
  async evolve(learnings: Learnings): Promise<void> {
    this.currentPhase = "evolve";

    // Check for due experiments
    await this.configEvolver.checkExperiments();

    // Apply auto-approved proposals
    for (const proposal of learnings.configProposals) {
      if (proposal.autoApply) {
        // Would need full proposal object from learning engine
        console.log(`[Orchestrator] Would auto-apply: ${proposal.target}`);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    status: OrchestratorStatus;
    phase: LoopPhase;
    iterations: number;
    lastIteration?: LoopIteration;
  } {
    return {
      status: this.status,
      phase: this.currentPhase,
      iterations: this.iterations.length,
      lastIteration: this.iterations[this.iterations.length - 1],
    };
  }

  /**
   * Get metrics summary
   */
  getMetrics(): {
    autonomousExecutionRate: number;
    successRate: number;
    averageConfidence: number;
    iterationsPerHour: number;
  } {
    const recentIterations = this.iterations.slice(-20);

    // Calculate metrics from recent iterations
    const totalTasks = recentIterations.reduce(
      (sum, iter) => sum + (iter.results.plan?.tasks.length || 0),
      0
    );
    const executedTasks = recentIterations.reduce(
      (sum, iter) => sum + (iter.results.build?.length || 0),
      0
    );
    const successfulTasks = recentIterations.reduce(
      (sum, iter) =>
        sum + (iter.results.build?.filter((b) => b.success).length || 0),
      0
    );

    return {
      autonomousExecutionRate:
        totalTasks > 0 ? (executedTasks / totalTasks) * 100 : 0,
      successRate:
        executedTasks > 0 ? (successfulTasks / executedTasks) * 100 : 0,
      averageConfidence: 0, // Would calculate from actual data
      iterationsPerHour:
        recentIterations.length > 0
          ? recentIterations.length / (this.config.senseInterval / 3600000)
          : 0,
    };
  }

  /**
   * Run a manual benchmark suite
   */
  async runBenchmark(suiteId: string): Promise<void> {
    // Would load suite by ID and run
    console.log(`[Orchestrator] Would run benchmark suite: ${suiteId}`);
  }

  /**
   * Trigger manual learning extraction
   */
  async triggerLearning(): Promise<LearningReport> {
    return this.learningEngine.extractLearnings();
  }

  /**
   * Trigger manual config evolution
   */
  async triggerEvolution(): Promise<void> {
    const proposals = await this.learningEngine.proposeConfigUpdates();
    for (const proposal of proposals) {
      console.log(`[Orchestrator] Proposal: ${proposal.target}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart loop if interval changed
    if (this.status === "running" && config.senseInterval) {
      this.pause();
      this.resume();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultOrchestrator: AutonomousOrchestrator | null = null;

export function getOrchestrator(
  config?: Partial<OrchestratorConfig>
): AutonomousOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new AutonomousOrchestrator(config);
  }
  return defaultOrchestrator;
}

export function resetOrchestrator(): void {
  if (defaultOrchestrator) {
    defaultOrchestrator.stop();
  }
  defaultOrchestrator = null;
}
