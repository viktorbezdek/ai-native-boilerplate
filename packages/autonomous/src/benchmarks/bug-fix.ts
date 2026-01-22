/**
 * Bug Fix Benchmark Spec
 * Measures quality of bug fixes
 */

import type { BenchmarkSpec, BenchmarkSuite } from "../types/benchmark";

/**
 * Simple bug fix benchmark
 */
export const simpleBugFixBenchmark: BenchmarkSpec = {
  id: "bugfix-simple",
  name: "Simple Bug Fix",
  description: "Benchmark for fixing simple, isolated bugs",
  category: "bug-fix",
  dimensions: ["quality", "completeness", "speed"],
  expectedOutcomes: {
    testsAdded: true,
    regressionPrevented: true,
    maxTokens: 2000,
    maxIterations: 2,
    expectedTime: 30000,
  },
  threshold: 85,
  timeout: 60000,
  tags: ["bugfix", "simple"],
};

/**
 * Complex bug fix benchmark
 */
export const complexBugFixBenchmark: BenchmarkSpec = {
  id: "bugfix-complex",
  name: "Complex Bug Fix",
  description: "Benchmark for fixing bugs requiring investigation",
  category: "bug-fix",
  dimensions: ["quality", "completeness", "efficiency", "speed"],
  expectedOutcomes: {
    testsAdded: true,
    regressionPrevented: true,
    rootCauseIdentified: true,
    maxTokens: 10000,
    maxIterations: 5,
    expectedTime: 120000,
  },
  threshold: 75,
  timeout: 180000,
  tags: ["bugfix", "complex"],
};

/**
 * Regression bug fix benchmark
 */
export const regressionBugFixBenchmark: BenchmarkSpec = {
  id: "bugfix-regression",
  name: "Regression Bug Fix",
  description: "Benchmark for fixing regressions with test verification",
  category: "bug-fix",
  dimensions: ["quality", "completeness", "drift"],
  expectedOutcomes: {
    testsAdded: true,
    regressionPrevented: true,
    noNewRegressions: true,
    maxTokens: 8000,
    maxIterations: 4,
    expectedTime: 90000,
  },
  threshold: 80,
  timeout: 150000,
  tags: ["bugfix", "regression"],
};

/**
 * Bug fix benchmark suite
 */
export const bugFixSuite: BenchmarkSuite = {
  id: "bug-fix-suite",
  name: "Bug Fix Suite",
  description: "Comprehensive benchmarks for bug fix quality",
  specs: [
    simpleBugFixBenchmark,
    complexBugFixBenchmark,
    regressionBugFixBenchmark,
  ],
  executionOrder: "sequential",
  tags: ["bugfix"],
};
