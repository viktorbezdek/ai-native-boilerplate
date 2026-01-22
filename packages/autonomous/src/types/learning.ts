/**
 * Learning types for the self-evolving system.
 * Enables extraction of insights and configuration evolution.
 */

import { z } from "zod";

/**
 * Types of learnings that can be extracted
 */
export type LearningType =
  | "pattern"
  | "anti-pattern"
  | "optimization"
  | "failure-mode"
  | "success-factor";

/**
 * Confidence level for a learning
 */
export type LearningConfidence = "high" | "medium" | "low";

/**
 * A single extracted learning
 */
export interface Learning {
  /** Unique identifier */
  id: string;
  /** Type of learning */
  type: LearningType;
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Confidence in this learning */
  confidence: LearningConfidence;
  /** Evidence supporting this learning */
  evidence: LearningEvidence[];
  /** Suggested actions based on this learning */
  suggestedActions: string[];
  /** Related task types */
  applicableTo: string[];
  /** When this learning was extracted */
  extractedAt: Date;
  /** Source data time range */
  sourceRange: {
    start: Date;
    end: Date;
  };
  /** Tags for organization */
  tags: string[];
}

/**
 * Evidence for a learning
 */
export interface LearningEvidence {
  /** Type of evidence */
  type: "execution" | "benchmark" | "metric" | "feedback";
  /** Reference to the source */
  sourceId: string;
  /** Description of the evidence */
  description: string;
  /** Quantitative value if applicable */
  value?: number;
  /** Timestamp of the evidence */
  timestamp: Date;
}

/**
 * Report containing multiple learnings
 */
export interface LearningReport {
  /** Report ID */
  id: string;
  /** Time range covered */
  period: {
    start: Date;
    end: Date;
  };
  /** Extracted learnings */
  learnings: Learning[];
  /** Summary statistics */
  summary: LearningSummary;
  /** Generated at timestamp */
  generatedAt: Date;
}

/**
 * Summary of learnings in a report
 */
export interface LearningSummary {
  /** Total learnings extracted */
  total: number;
  /** By type breakdown */
  byType: Record<LearningType, number>;
  /** By confidence breakdown */
  byConfidence: Record<LearningConfidence, number>;
  /** Top patterns identified */
  topPatterns: string[];
  /** Critical anti-patterns */
  criticalAntiPatterns: string[];
  /** Recommended optimizations */
  recommendations: string[];
}

/**
 * Configuration proposal for evolution
 */
export interface ConfigProposal {
  /** Proposal ID */
  id: string;
  /** What configuration is being changed */
  target:
    | "confidence-thresholds"
    | "signal-weights"
    | "trigger-conditions"
    | "benchmark-thresholds";
  /** Current value */
  currentValue: unknown;
  /** Proposed new value */
  proposedValue: unknown;
  /** Reasoning for the change */
  reasoning: string[];
  /** Expected impact */
  expectedImpact: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    confidence: number;
  }[];
  /** Learning IDs that support this proposal */
  supportingLearnings: string[];
  /** Risk level of the change */
  riskLevel: "low" | "medium" | "high";
  /** Whether to auto-apply or require approval */
  autoApply: boolean;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Result of applying a config evolution
 */
export interface EvolutionResult {
  /** Proposal ID */
  proposalId: string;
  /** Whether the evolution was applied */
  applied: boolean;
  /** Actual impact observed (after observation period) */
  actualImpact?: {
    metric: string;
    beforeValue: number;
    afterValue: number;
    improvement: number;
  }[];
  /** Whether to keep or rollback */
  verdict?: "keep" | "rollback";
  /** Applied timestamp */
  appliedAt?: Date;
  /** Evaluation timestamp */
  evaluatedAt?: Date;
  /** Notes */
  notes: string[];
}

/**
 * Skill score tracking for agents
 */
export interface SkillScore {
  /** Agent or skill identifier */
  skillId: string;
  /** Overall score (0-100) */
  score: number;
  /** Task type scores */
  taskTypeScores: Record<string, number>;
  /** Recent performance trend */
  trend: "improving" | "stable" | "declining";
  /** Sample size for this score */
  sampleSize: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Configuration for the learning engine
 */
export interface LearningEngineConfig {
  /** Minimum executions required for pattern detection */
  minSampleSize: number;
  /** Confidence threshold for auto-applying learnings */
  autoApplyThreshold: number;
  /** How far back to look for learnings (days) */
  defaultLookback: number;
  /** Path to logs directory */
  logsPath: string;
  /** Output path for learning reports */
  outputPath: string;
}

/**
 * Default learning engine configuration
 */
export const DEFAULT_LEARNING_CONFIG: LearningEngineConfig = {
  minSampleSize: 10,
  autoApplyThreshold: 0.9,
  defaultLookback: 7,
  logsPath: ".claude/logs",
  outputPath: ".claude/logs/learnings",
};

/**
 * Configuration evolver settings
 */
export interface ConfigEvolverConfig {
  /** Observation period after applying change (ms) */
  observationPeriod: number;
  /** Minimum improvement required to keep change */
  minImprovementThreshold: number;
  /** Maximum concurrent experiments */
  maxConcurrentExperiments: number;
  /** Auto-rollback on regression */
  autoRollback: boolean;
}

/**
 * Default config evolver settings
 */
export const DEFAULT_EVOLVER_CONFIG: ConfigEvolverConfig = {
  observationPeriod: 24 * 60 * 60 * 1000, // 24 hours
  minImprovementThreshold: 0.05, // 5% improvement
  maxConcurrentExperiments: 3,
  autoRollback: true,
};

/**
 * Zod schemas for validation
 */
export const LearningSchema = z.object({
  id: z.string(),
  type: z.enum([
    "pattern",
    "anti-pattern",
    "optimization",
    "failure-mode",
    "success-factor",
  ]),
  title: z.string(),
  description: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(
    z.object({
      type: z.enum(["execution", "benchmark", "metric", "feedback"]),
      sourceId: z.string(),
      description: z.string(),
      value: z.number().optional(),
      timestamp: z.date(),
    })
  ),
  suggestedActions: z.array(z.string()),
  applicableTo: z.array(z.string()),
  extractedAt: z.date(),
  sourceRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  tags: z.array(z.string()),
});

export const ConfigProposalSchema = z.object({
  id: z.string(),
  target: z.enum([
    "confidence-thresholds",
    "signal-weights",
    "trigger-conditions",
    "benchmark-thresholds",
  ]),
  currentValue: z.unknown(),
  proposedValue: z.unknown(),
  reasoning: z.array(z.string()),
  expectedImpact: z.array(
    z.object({
      metric: z.string(),
      currentValue: z.number(),
      expectedValue: z.number(),
      confidence: z.number(),
    })
  ),
  supportingLearnings: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high"]),
  autoApply: z.boolean(),
  createdAt: z.date(),
});
