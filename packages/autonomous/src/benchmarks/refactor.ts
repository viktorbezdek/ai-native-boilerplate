/**
 * Refactor Benchmark Spec
 * Measures quality of code refactoring
 */

import type { BenchmarkSpec, BenchmarkSuite } from "../types/benchmark";

/**
 * Small refactor benchmark
 */
export const smallRefactorBenchmark: BenchmarkSpec = {
  id: "refactor-small",
  name: "Small Refactor",
  description: "Benchmark for small-scale refactoring tasks",
  category: "refactor",
  dimensions: ["quality", "drift", "efficiency"],
  expectedOutcomes: {
    behaviorPreserved: true,
    testsPass: true,
    codeReduction: 0, // May not always reduce code
    maxTokens: 5000,
    maxIterations: 3,
    expectedTime: 60000,
  },
  threshold: 85,
  timeout: 120000,
  tags: ["refactor", "small"],
};

/**
 * Module refactor benchmark
 */
export const moduleRefactorBenchmark: BenchmarkSpec = {
  id: "refactor-module",
  name: "Module Refactor",
  description: "Benchmark for refactoring entire modules",
  category: "refactor",
  dimensions: ["quality", "completeness", "drift", "efficiency"],
  expectedOutcomes: {
    behaviorPreserved: true,
    testsPass: true,
    improvedStructure: true,
    maxTokens: 20000,
    maxIterations: 10,
    expectedTime: 300000,
  },
  threshold: 75,
  timeout: 450000,
  tags: ["refactor", "module"],
};

/**
 * Architectural refactor benchmark
 */
export const architecturalRefactorBenchmark: BenchmarkSpec = {
  id: "refactor-architectural",
  name: "Architectural Refactor",
  description: "Benchmark for large-scale architectural changes",
  category: "refactor",
  dimensions: ["quality", "completeness", "drift", "efficiency", "speed"],
  expectedOutcomes: {
    behaviorPreserved: true,
    testsPass: true,
    improvedStructure: true,
    documentationUpdated: true,
    maxTokens: 50000,
    maxIterations: 25,
    expectedTime: 900000,
  },
  threshold: 70,
  timeout: 1200000,
  tags: ["refactor", "architectural"],
};

/**
 * Refactor benchmark suite
 */
export const refactorSuite: BenchmarkSuite = {
  id: "refactor-suite",
  name: "Refactor Suite",
  description: "Comprehensive benchmarks for refactoring quality",
  specs: [
    smallRefactorBenchmark,
    moduleRefactorBenchmark,
    architecturalRefactorBenchmark,
  ],
  executionOrder: "sequential",
  tags: ["refactor"],
};
