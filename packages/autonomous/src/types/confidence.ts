/**
 * Confidence scoring types for the autonomous development system.
 * Enables confidence-gated autonomous decisions based on multiple signal sources.
 */

import { z } from "zod";

/**
 * Sources of confidence signals
 */
export const SignalSourceSchema = z.enum([
  "tests",
  "lint",
  "build",
  "review",
  "benchmark",
  "history",
  "sentry",
  "posthog",
]);

export type SignalSource = z.infer<typeof SignalSourceSchema>;

/**
 * A single confidence signal from a specific source
 */
export interface ConfidenceSignal {
  /** Source of the signal */
  source: SignalSource;
  /** Signal value (0-100) */
  value: number;
  /** Weight of this signal in overall calculation (0-1) */
  weight: number;
  /** When this signal was captured */
  timestamp: Date;
  /** Additional context about the signal */
  metadata?: Record<string, unknown>;
}

/**
 * Confidence-based decision thresholds
 */
export type ConfidenceDecision =
  | "auto-execute"
  | "notify"
  | "require-approval"
  | "escalate";

/**
 * Result of confidence calculation for a task
 */
export interface ConfidenceResult {
  /** Weighted average confidence score (0-100) */
  score: number;
  /** Individual signals used in calculation */
  signals: ConfidenceSignal[];
  /** Decision based on score thresholds */
  decision: ConfidenceDecision;
  /** Human-readable reasoning for the decision */
  reasoning: string[];
  /** Timestamp of calculation */
  calculatedAt: Date;
}

/**
 * Thresholds for confidence-based decisions
 */
export interface ConfidenceThresholds {
  /** Score >= this triggers auto-execute */
  autoExecute: number;
  /** Score >= this triggers notify */
  notify: number;
  /** Score >= this triggers require-approval */
  requireApproval: number;
  /** Score < requireApproval triggers escalate */
}

/**
 * Default confidence thresholds
 */
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  autoExecute: 95,
  notify: 80,
  requireApproval: 60,
};

/**
 * Default signal weights by source
 */
export const DEFAULT_SIGNAL_WEIGHTS: Record<SignalSource, number> = {
  tests: 0.25,
  lint: 0.1,
  build: 0.15,
  review: 0.15,
  benchmark: 0.1,
  history: 0.15,
  sentry: 0.05,
  posthog: 0.05,
};

/**
 * Configuration for the confidence engine
 */
export interface ConfidenceEngineConfig {
  /** Confidence thresholds for decisions */
  thresholds: ConfidenceThresholds;
  /** Weights for each signal source */
  weights: Record<SignalSource, number>;
  /** Minimum number of signals required for valid calculation */
  minSignals: number;
  /** Maximum age of signals to consider (ms) */
  maxSignalAge: number;
  /** Path to logs directory for reading historical data */
  logsPath: string;
}

/**
 * Default confidence engine configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceEngineConfig = {
  thresholds: DEFAULT_CONFIDENCE_THRESHOLDS,
  weights: DEFAULT_SIGNAL_WEIGHTS,
  minSignals: 3,
  maxSignalAge: 24 * 60 * 60 * 1000, // 24 hours
  logsPath: ".claude/logs",
};

/**
 * Historical execution data for confidence calculation
 */
export interface ExecutionRecord {
  id: string;
  taskType: string;
  success: boolean;
  timestamp: Date;
  duration: number;
  confidenceScore?: number;
  actualOutcome?: string;
}

/**
 * Quality metrics from logs
 */
export interface QualityMetrics {
  testCoverage: number;
  testsPassing: number;
  testsTotal: number;
  lintErrors: number;
  lintWarnings: number;
  buildSuccess: boolean;
  timestamp: Date;
}

/**
 * Zod schemas for validation
 */
export const ConfidenceSignalSchema = z.object({
  source: SignalSourceSchema,
  value: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  timestamp: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const ConfidenceResultSchema = z.object({
  score: z.number().min(0).max(100),
  signals: z.array(ConfidenceSignalSchema),
  decision: z.enum(["auto-execute", "notify", "require-approval", "escalate"]),
  reasoning: z.array(z.string()),
  calculatedAt: z.date(),
});
