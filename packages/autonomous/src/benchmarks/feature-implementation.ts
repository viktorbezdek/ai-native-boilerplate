/**
 * Feature Implementation Benchmark Spec
 * Measures quality of new feature implementations
 */

import type { BenchmarkSpec, BenchmarkSuite } from "../types/benchmark";

/**
 * Small feature implementation benchmark
 */
export const smallFeatureBenchmark: BenchmarkSpec = {
  id: "feature-small",
  name: "Small Feature Implementation",
  description: "Benchmark for implementing small, well-defined features",
  category: "feature-implementation",
  dimensions: ["quality", "completeness", "efficiency", "speed"],
  expectedOutcomes: {
    files: [], // Expected files to be created/modified
    patterns: {}, // Expected patterns in files
    maxTokens: 5000,
    maxIterations: 3,
    expectedTime: 60000,
  },
  threshold: 80,
  timeout: 120000,
  tags: ["feature", "small"],
};

/**
 * Medium feature implementation benchmark
 */
export const mediumFeatureBenchmark: BenchmarkSpec = {
  id: "feature-medium",
  name: "Medium Feature Implementation",
  description: "Benchmark for implementing medium-complexity features",
  category: "feature-implementation",
  dimensions: ["quality", "completeness", "efficiency", "drift", "speed"],
  expectedOutcomes: {
    files: [],
    patterns: {},
    maxTokens: 15000,
    maxIterations: 8,
    expectedTime: 180000,
  },
  threshold: 75,
  timeout: 300000,
  tags: ["feature", "medium"],
};

/**
 * Large feature implementation benchmark
 */
export const largeFeatureBenchmark: BenchmarkSpec = {
  id: "feature-large",
  name: "Large Feature Implementation",
  description: "Benchmark for implementing complex, multi-file features",
  category: "feature-implementation",
  dimensions: ["quality", "completeness", "efficiency", "drift", "speed"],
  expectedOutcomes: {
    files: [],
    patterns: {},
    maxTokens: 50000,
    maxIterations: 20,
    expectedTime: 600000,
  },
  threshold: 70,
  timeout: 900000,
  tags: ["feature", "large"],
};

/**
 * Feature implementation benchmark suite
 */
export const featureImplementationSuite: BenchmarkSuite = {
  id: "feature-implementation-suite",
  name: "Feature Implementation Suite",
  description: "Comprehensive benchmarks for feature implementation quality",
  specs: [smallFeatureBenchmark, mediumFeatureBenchmark, largeFeatureBenchmark],
  executionOrder: "sequential",
  tags: ["feature", "implementation"],
};
