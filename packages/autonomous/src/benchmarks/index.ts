/**
 * Benchmark specs exports
 */

export {
  smallFeatureBenchmark,
  mediumFeatureBenchmark,
  largeFeatureBenchmark,
  featureImplementationSuite,
} from "./feature-implementation";

export {
  simpleBugFixBenchmark,
  complexBugFixBenchmark,
  regressionBugFixBenchmark,
  bugFixSuite,
} from "./bug-fix";

export {
  smallRefactorBenchmark,
  moduleRefactorBenchmark,
  architecturalRefactorBenchmark,
  refactorSuite,
} from "./refactor";

import type { BenchmarkSuite } from "../types/benchmark";
import { bugFixSuite } from "./bug-fix";
import { featureImplementationSuite } from "./feature-implementation";
import { refactorSuite } from "./refactor";

/**
 * Full benchmark suite containing all benchmarks
 */
export const fullBenchmarkSuite: BenchmarkSuite = {
  id: "full-suite",
  name: "Full Benchmark Suite",
  description: "All benchmarks for comprehensive quality assessment",
  specs: [
    ...featureImplementationSuite.specs,
    ...bugFixSuite.specs,
    ...refactorSuite.specs,
  ],
  executionOrder: "sequential",
  tags: ["full", "comprehensive"],
};

/**
 * Quick benchmark suite for CI/CD
 */
export const quickBenchmarkSuite: BenchmarkSuite = {
  id: "quick-suite",
  name: "Quick Benchmark Suite",
  description: "Fast benchmarks for CI/CD pipelines",
  specs: [
    featureImplementationSuite.specs[0], // small feature
    bugFixSuite.specs[0], // simple bugfix
    refactorSuite.specs[0], // small refactor
  ].filter((spec): spec is NonNullable<typeof spec> => spec != null),
  executionOrder: "parallel",
  tags: ["quick", "ci"],
};
