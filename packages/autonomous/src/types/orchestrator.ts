/**
 * Orchestrator types for the closed-loop feedback system.
 * Coordinates Sense → Analyze → Plan → Build → Verify → Deploy → Monitor → Learn → Evolve.
 */

import { z } from "zod";

import type { BenchmarkResult } from "./benchmark";
import type { ConfidenceResult } from "./confidence";
import type { ConfigProposal, Learning, LearningReport } from "./learning";

// Re-export ConfigProposal for convenience
export type { ConfigProposal } from "./learning";

import type { Signal, SignalMetrics } from "./signal";

/**
 * Phases of the closed-loop feedback system
 */
export type LoopPhase =
  | "sense"
  | "analyze"
  | "plan"
  | "build"
  | "verify"
  | "deploy"
  | "monitor"
  | "learn"
  | "evolve"
  | "idle";

/**
 * Status of the orchestrator
 */
export type OrchestratorStatus =
  | "running"
  | "paused"
  | "stopped"
  | "error"
  | "initializing";

/**
 * Result of the sense phase
 */
export interface SenseResult {
  signals: Signal[];
  metrics: SignalMetrics;
  timestamp: Date;
}

/**
 * Result of the analyze phase
 */
export interface AnalysisResult {
  patterns: PatternAnalysis[];
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  overallHealth: number;
  timestamp: Date;
}

/**
 * A pattern detected in signals
 */
export interface PatternAnalysis {
  id: string;
  type: "recurring" | "trend" | "correlation" | "outlier";
  description: string;
  confidence: number;
  affectedSignals: string[];
  suggestedAction?: string;
}

/**
 * An anomaly detected in signals
 */
export interface Anomaly {
  id: string;
  type: "spike" | "drop" | "unexpected" | "missing";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedMetrics: string[];
  detectedAt: Date;
}

/**
 * A recommendation from analysis
 */
export interface Recommendation {
  id: string;
  priority: "low" | "medium" | "high";
  description: string;
  action: string;
  expectedImpact: string;
}

/**
 * Task generated from analysis
 */
export interface PlannedTask {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: "S" | "M" | "L" | "XL";
  dependencies: string[];
  confidence: ConfidenceResult;
  sourceAnalysis: string;
}

/**
 * Result of the plan phase
 */
export interface PlanResult {
  tasks: PlannedTask[];
  estimatedDuration: number;
  riskAssessment: RiskAssessment;
  timestamp: Date;
}

/**
 * Risk assessment for a plan
 */
export interface RiskAssessment {
  overallRisk: "low" | "medium" | "high";
  factors: {
    factor: string;
    impact: number;
    likelihood: number;
    mitigation?: string;
  }[];
}

/**
 * Result of the build phase
 */
export interface BuildResult {
  taskId: string;
  success: boolean;
  artifacts: BuildArtifact[];
  duration: number;
  error?: string;
  timestamp: Date;
}

/**
 * An artifact produced during build
 */
export interface BuildArtifact {
  type: "file" | "test" | "documentation" | "config";
  path: string;
  hash?: string;
  size?: number;
}

/**
 * Result of the verify phase
 */
export interface VerificationResult {
  buildResults: BuildResult[];
  testResults: TestVerification;
  lintResults: LintVerification;
  benchmarkResults?: BenchmarkResult[];
  overallPassed: boolean;
  timestamp: Date;
}

/**
 * Test verification details
 */
export interface TestVerification {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
}

/**
 * Lint verification details
 */
export interface LintVerification {
  errors: number;
  warnings: number;
  fixed: number;
  filesChecked: number;
}

/**
 * Result of the deploy phase
 */
export interface DeployResult {
  environment: "development" | "staging" | "production";
  success: boolean;
  version: string;
  url?: string;
  duration: number;
  rollbackAvailable: boolean;
  timestamp: Date;
}

/**
 * Result of the monitor phase
 */
export interface MonitoringData {
  deployment: DeployResult;
  healthChecks: HealthCheck[];
  errorRate: number;
  latency: LatencyStats;
  userImpact: UserImpactMetrics;
  duration: number;
  timestamp: Date;
}

/**
 * A health check result
 */
export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  lastChecked: Date;
}

/**
 * Latency statistics
 */
export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

/**
 * User impact metrics
 */
export interface UserImpactMetrics {
  affectedUsers: number;
  errorCount: number;
  featureUsage: Record<string, number>;
}

/**
 * Result of the learn phase
 */
export interface Learnings {
  report: LearningReport;
  newPatterns: Learning[];
  configProposals: ConfigProposal[];
  timestamp: Date;
}

/**
 * Full loop iteration result
 */
export interface LoopIteration {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  phase: LoopPhase;
  results: {
    sense?: SenseResult;
    analyze?: AnalysisResult;
    plan?: PlanResult;
    build?: BuildResult[];
    verify?: VerificationResult;
    deploy?: DeployResult;
    monitor?: MonitoringData;
    learn?: Learnings;
  };
  error?: string;
  metrics: IterationMetrics;
}

/**
 * Metrics for a loop iteration
 */
export interface IterationMetrics {
  totalDuration: number;
  phasesDuration: Record<LoopPhase, number>;
  tasksExecuted: number;
  confidenceAverage: number;
  qualityScore: number;
}

/**
 * Configuration for the autonomous orchestrator
 */
export interface OrchestratorConfig {
  /** How often to run the sense phase (ms) */
  senseInterval: number;
  /** Maximum concurrent build tasks */
  buildConcurrency: number;
  /** Auto-deploy threshold (confidence score) */
  autoDeployThreshold: number;
  /** Environment to auto-deploy to */
  autoDeployEnvironment: "development" | "staging";
  /** Enable auto-evolution */
  enableAutoEvolution: boolean;
  /** Monitoring duration after deploy (ms) */
  monitoringDuration: number;
  /** Enable dry-run mode */
  dryRun: boolean;
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  senseInterval: 60000,
  buildConcurrency: 3,
  autoDeployThreshold: 95,
  autoDeployEnvironment: "staging",
  enableAutoEvolution: false,
  monitoringDuration: 300000, // 5 minutes
  dryRun: false,
};

/**
 * Zod schemas for validation
 */
export const LoopPhaseSchema = z.enum([
  "sense",
  "analyze",
  "plan",
  "build",
  "verify",
  "deploy",
  "monitor",
  "learn",
  "evolve",
  "idle",
]);

export const OrchestratorStatusSchema = z.enum([
  "running",
  "paused",
  "stopped",
  "error",
  "initializing",
]);

export const OrchestratorConfigSchema = z.object({
  senseInterval: z.number().positive(),
  buildConcurrency: z.number().positive(),
  autoDeployThreshold: z.number().min(0).max(100),
  autoDeployEnvironment: z.enum(["development", "staging"]),
  enableAutoEvolution: z.boolean(),
  monitoringDuration: z.number().positive(),
  dryRun: z.boolean(),
});
