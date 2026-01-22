/**
 * Benchmark types for measuring autonomous development quality.
 * Enables benchmark-driven configuration evolution.
 */

import { z } from "zod";

/**
 * Dimensions measured by benchmarks
 */
export const BenchmarkDimensionSchema = z.enum([
  "quality",
  "completeness",
  "efficiency",
  "drift",
  "speed",
]);

export type BenchmarkDimension = z.infer<typeof BenchmarkDimensionSchema>;

/**
 * Benchmark task categories
 */
export type BenchmarkCategory =
  | "feature-implementation"
  | "bug-fix"
  | "refactor"
  | "test-coverage"
  | "documentation";

/**
 * Specification for a single benchmark
 */
export interface BenchmarkSpec {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this benchmark measures */
  description: string;
  /** Category of task this benchmark applies to */
  category: BenchmarkCategory;
  /** Dimensions this benchmark measures */
  dimensions: BenchmarkDimension[];
  /** Expected outcomes for comparison */
  expectedOutcomes: Record<string, unknown>;
  /** Minimum passing threshold (0-100) */
  threshold: number;
  /** Timeout for benchmark execution (ms) */
  timeout: number;
  /** Tags for filtering and organization */
  tags: string[];
}

/**
 * Score for a single benchmark dimension
 */
export interface DimensionScore {
  dimension: BenchmarkDimension;
  score: number;
  maxScore: number;
  details: string[];
}

/**
 * Result of running a single benchmark
 */
export interface BenchmarkResult {
  /** Spec ID this result is for */
  specId: string;
  /** Scores by dimension */
  scores: Record<BenchmarkDimension, number>;
  /** Dimension-level details */
  dimensionDetails: DimensionScore[];
  /** Overall score (weighted average) */
  overall: number;
  /** Whether the benchmark passed */
  passed: boolean;
  /** Time taken to run (ms) */
  duration: number;
  /** Timestamp of execution */
  executedAt: Date;
  /** Any errors that occurred */
  errors: string[];
  /** Detailed artifacts from the benchmark */
  artifacts: BenchmarkArtifact[];
}

/**
 * Artifact produced by a benchmark
 */
export interface BenchmarkArtifact {
  type: "file" | "log" | "metric" | "diff";
  name: string;
  path?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Suite of benchmarks to run together
 */
export interface BenchmarkSuite {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the suite */
  description: string;
  /** Benchmark specs in this suite */
  specs: BenchmarkSpec[];
  /** Order of execution (sequential or parallel) */
  executionOrder: "sequential" | "parallel";
  /** Tags for filtering */
  tags: string[];
}

/**
 * Result of running a benchmark suite
 */
export interface SuiteResult {
  /** Suite ID */
  suiteId: string;
  /** Individual benchmark results */
  results: BenchmarkResult[];
  /** Aggregate score across all benchmarks */
  aggregateScore: number;
  /** Total time taken (ms) */
  totalDuration: number;
  /** Pass/fail status */
  passed: boolean;
  /** Timestamp */
  executedAt: Date;
  /** Summary statistics */
  summary: SuiteSummary;
}

/**
 * Summary statistics for a suite run
 */
export interface SuiteSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  averageScore: number;
  scoreByDimension: Record<BenchmarkDimension, number>;
}

/**
 * Configuration for the benchmark runner
 */
export interface BenchmarkRunnerConfig {
  /** Directory to store benchmark results */
  outputDir: string;
  /** Maximum concurrent benchmark executions */
  concurrency: number;
  /** Default timeout for benchmarks (ms) */
  defaultTimeout: number;
  /** Whether to fail fast on first failure */
  failFast: boolean;
  /** Retry count for flaky benchmarks */
  retries: number;
}

/**
 * Default benchmark runner configuration
 */
export const DEFAULT_BENCHMARK_CONFIG: BenchmarkRunnerConfig = {
  outputDir: ".claude/logs/benchmarks",
  concurrency: 4,
  defaultTimeout: 60000,
  failFast: false,
  retries: 2,
};

/**
 * Weights for each dimension in overall score calculation
 */
export const DEFAULT_DIMENSION_WEIGHTS: Record<BenchmarkDimension, number> = {
  quality: 0.3,
  completeness: 0.25,
  efficiency: 0.2,
  drift: 0.15,
  speed: 0.1,
};

/**
 * Zod schemas for validation
 */
export const BenchmarkSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    "feature-implementation",
    "bug-fix",
    "refactor",
    "test-coverage",
    "documentation",
  ]),
  dimensions: z.array(BenchmarkDimensionSchema),
  expectedOutcomes: z.record(z.unknown()),
  threshold: z.number().min(0).max(100),
  timeout: z.number().positive(),
  tags: z.array(z.string()),
});

export const BenchmarkResultSchema = z.object({
  specId: z.string(),
  scores: z.record(BenchmarkDimensionSchema, z.number()),
  overall: z.number().min(0).max(100),
  passed: z.boolean(),
  duration: z.number(),
  executedAt: z.date(),
  errors: z.array(z.string()),
});
