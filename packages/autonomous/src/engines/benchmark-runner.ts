/**
 * Benchmark Runner for measuring autonomous development quality.
 * Executes benchmark suites and measures quality, completeness, efficiency, drift, and speed.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  BenchmarkArtifact,
  BenchmarkDimension,
  BenchmarkResult,
  BenchmarkRunnerConfig,
  BenchmarkSpec,
  BenchmarkSuite,
  DimensionScore,
  SuiteResult,
  SuiteSummary,
} from "../types/benchmark";
import {
  DEFAULT_BENCHMARK_CONFIG,
  DEFAULT_DIMENSION_WEIGHTS,
} from "../types/benchmark";

/**
 * Context for benchmark execution
 */
export interface BenchmarkContext {
  workingDir: string;
  logsPath: string;
  artifacts: BenchmarkArtifact[];
}

/**
 * Benchmark Runner for quality measurement
 */
export class BenchmarkRunner {
  private config: BenchmarkRunnerConfig;

  constructor(config: Partial<BenchmarkRunnerConfig> = {}) {
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
  }

  /**
   * Run a benchmark suite
   */
  async runSuite(suite: BenchmarkSuite): Promise<SuiteResult> {
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];
    let failedCount = 0;

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    if (suite.executionOrder === "sequential") {
      // Run benchmarks sequentially
      for (const spec of suite.specs) {
        const result = await this.runBenchmark(spec);
        results.push(result);

        if (!result.passed) {
          failedCount++;
          if (this.config.failFast) {
            break;
          }
        }
      }
    } else {
      // Run benchmarks in parallel with concurrency limit
      const chunks = this.chunkArray(suite.specs, this.config.concurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((spec) => this.runBenchmark(spec))
        );
        results.push(...chunkResults);

        failedCount += chunkResults.filter((r) => !r.passed).length;

        if (this.config.failFast && failedCount > 0) {
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const aggregateScore = this.calculateAggregateScore(results);
    const summary = this.generateSummary(results);

    const suiteResult: SuiteResult = {
      suiteId: suite.id,
      results,
      aggregateScore,
      totalDuration,
      passed: failedCount === 0,
      executedAt: new Date(),
      summary,
    };

    // Save results
    await this.saveSuiteResult(suiteResult);

    return suiteResult;
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark(spec: BenchmarkSpec): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const artifacts: BenchmarkArtifact[] = [];
    const scores: Record<BenchmarkDimension, number> = {
      quality: 0,
      completeness: 0,
      efficiency: 0,
      drift: 0,
      speed: 0,
    };
    const dimensionDetails: DimensionScore[] = [];

    let retries = 0;

    while (retries <= this.config.retries) {
      try {
        // Create context for benchmark
        const context: BenchmarkContext = {
          workingDir: process.cwd(),
          logsPath: path.join(this.config.outputDir, spec.id),
          artifacts: [],
        };

        // Measure each dimension
        for (const dimension of spec.dimensions) {
          const score = await this.measureDimension(
            dimension,
            spec,
            context,
            dimensionDetails
          );
          scores[dimension] = score;
        }

        break; // Success, exit retry loop
      } catch (error) {
        retries++;
        if (retries > this.config.retries) {
          errors.push(
            `Benchmark failed after ${this.config.retries} retries: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    const duration = Date.now() - startTime;
    const overall = this.calculateOverallScore(scores, spec.dimensions);
    const passed = overall >= spec.threshold && errors.length === 0;

    return {
      specId: spec.id,
      scores,
      dimensionDetails,
      overall,
      passed,
      duration,
      executedAt: new Date(),
      errors,
      artifacts,
    };
  }

  /**
   * Measure quality dimension
   */
  async measureQuality(
    _spec: BenchmarkSpec,
    context: BenchmarkContext
  ): Promise<number> {
    // Quality is measured by:
    // - Test coverage
    // - Lint cleanliness
    // - Type safety
    // - Code complexity

    let score = 0;
    const weights = { tests: 0.4, lint: 0.2, types: 0.2, complexity: 0.2 };

    try {
      // Check test coverage from quality.jsonl
      const qualityPath = path.join(
        context.logsPath,
        "..",
        "..",
        "quality.jsonl"
      );
      const content = await fs.readFile(qualityPath, "utf-8").catch(() => "");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length > 0) {
        const latest = JSON.parse(lines[lines.length - 1] || "{}");

        // Test score
        if (latest.tests) {
          const testScore = Math.min(100, latest.tests.coverage || 0);
          score += testScore * weights.tests;
        } else {
          score += 50 * weights.tests; // Default if no data
        }

        // Lint score
        if (latest.lint) {
          const lintScore = Math.max(
            0,
            100 -
              (latest.lint.errors || 0) * 10 -
              (latest.lint.warnings || 0) * 2
          );
          score += lintScore * weights.lint;
        } else {
          score += 50 * weights.lint;
        }
      } else {
        // No quality data, use defaults
        score = 50;
      }

      // Types assumed good if build passes
      score += 80 * weights.types;

      // Complexity assumed moderate
      score += 70 * weights.complexity;
    } catch {
      score = 50;
    }

    return Math.round(score);
  }

  /**
   * Measure completeness dimension
   */
  async measureCompleteness(
    spec: BenchmarkSpec,
    context: BenchmarkContext
  ): Promise<number> {
    // Completeness checks:
    // - All acceptance criteria met
    // - All files created/modified as expected
    // - Documentation updated

    let score = 100;
    const expected = spec.expectedOutcomes;

    // Check if expected files exist
    if (expected.files && Array.isArray(expected.files)) {
      let filesFound = 0;
      for (const file of expected.files) {
        try {
          await fs.access(path.join(context.workingDir, file as string));
          filesFound++;
        } catch {
          // File not found
        }
      }
      const fileScore = (filesFound / expected.files.length) * 100;
      score = Math.min(score, fileScore);
    }

    // Check patterns in files
    if (expected.patterns && typeof expected.patterns === "object") {
      const patterns = expected.patterns as Record<string, string>;
      let patternsFound = 0;
      const patternCount = Object.keys(patterns).length;

      for (const [file, pattern] of Object.entries(patterns)) {
        try {
          const content = await fs.readFile(
            path.join(context.workingDir, file),
            "utf-8"
          );
          if (content.includes(pattern)) {
            patternsFound++;
          }
        } catch {
          // File not found or read error
        }
      }

      if (patternCount > 0) {
        const patternScore = (patternsFound / patternCount) * 100;
        score = Math.min(score, patternScore);
      }
    }

    return Math.round(score);
  }

  /**
   * Measure efficiency dimension
   */
  async measureEfficiency(
    spec: BenchmarkSpec,
    context: BenchmarkContext
  ): Promise<number> {
    // Efficiency measures:
    // - Token usage vs expected
    // - File changes vs expected
    // - Iteration count

    let score = 100;
    const expected = spec.expectedOutcomes;

    try {
      const metricsPath = path.join(
        context.logsPath,
        "..",
        "..",
        "metrics.json"
      );
      const content = await fs.readFile(metricsPath, "utf-8").catch(() => "{}");
      const metrics = JSON.parse(content);

      // Check token usage
      if (expected.maxTokens && metrics.tokensUsed) {
        const tokenEfficiency = Math.min(
          100,
          ((expected.maxTokens as number) / metrics.tokensUsed) * 100
        );
        score = Math.min(score, tokenEfficiency);
      }

      // Check iteration count
      if (expected.maxIterations && metrics.iterations) {
        const iterationEfficiency = Math.min(
          100,
          ((expected.maxIterations as number) / metrics.iterations) * 100
        );
        score = Math.min(score, iterationEfficiency);
      }
    } catch {
      // Default to moderate efficiency if no metrics
      score = 70;
    }

    return Math.round(score);
  }

  /**
   * Measure drift dimension
   */
  async measureDrift(
    _spec: BenchmarkSpec,
    context: BenchmarkContext
  ): Promise<number> {
    // Drift measures:
    // - Style consistency
    // - Pattern adherence
    // - Scope creep

    let score = 100;

    try {
      const driftPath = path.join(context.logsPath, "..", "..", "drift.jsonl");
      const content = await fs.readFile(driftPath, "utf-8").catch(() => "");
      const lines = content.trim().split("\n").filter(Boolean);

      if (lines.length > 0) {
        // Check recent drift scores
        const recentLines = lines.slice(-10);
        let totalDrift = 0;

        for (const line of recentLines) {
          const entry = JSON.parse(line);
          totalDrift += entry.score || 0;
        }

        const avgDrift = totalDrift / recentLines.length;
        // Lower drift score means better (less drift)
        score = Math.max(0, 100 - avgDrift);
      }
    } catch {
      // No drift data, assume good
      score = 90;
    }

    return Math.round(score);
  }

  /**
   * Measure speed dimension
   */
  async measureSpeed(
    spec: BenchmarkSpec,
    _context: BenchmarkContext
  ): Promise<number> {
    // Speed measures:
    // - Execution time vs expected
    // - Response latency

    const expected = spec.expectedOutcomes;
    const expectedTime = (expected.expectedTime as number) || spec.timeout;

    // This would be measured during actual execution
    // For now, return a default based on timeout
    const score = Math.min(100, (expectedTime / spec.timeout) * 100);

    return Math.round(score);
  }

  /**
   * Measure a specific dimension
   */
  private async measureDimension(
    dimension: BenchmarkDimension,
    spec: BenchmarkSpec,
    context: BenchmarkContext,
    details: DimensionScore[]
  ): Promise<number> {
    let score = 0;
    const measureDetails: string[] = [];

    switch (dimension) {
      case "quality":
        score = await this.measureQuality(spec, context);
        measureDetails.push(`Quality score: ${score}/100`);
        break;
      case "completeness":
        score = await this.measureCompleteness(spec, context);
        measureDetails.push(`Completeness score: ${score}/100`);
        break;
      case "efficiency":
        score = await this.measureEfficiency(spec, context);
        measureDetails.push(`Efficiency score: ${score}/100`);
        break;
      case "drift":
        score = await this.measureDrift(spec, context);
        measureDetails.push(`Drift score: ${score}/100`);
        break;
      case "speed":
        score = await this.measureSpeed(spec, context);
        measureDetails.push(`Speed score: ${score}/100`);
        break;
    }

    details.push({
      dimension,
      score,
      maxScore: 100,
      details: measureDetails,
    });

    return score;
  }

  /**
   * Calculate overall score from dimension scores
   */
  private calculateOverallScore(
    scores: Record<BenchmarkDimension, number>,
    dimensions: BenchmarkDimension[]
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const dim of dimensions) {
      const weight = DEFAULT_DIMENSION_WEIGHTS[dim];
      weightedSum += scores[dim] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Calculate aggregate score from results
   */
  private calculateAggregateScore(results: BenchmarkResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const sum = results.reduce((acc, r) => acc + r.overall, 0);
    return Math.round(sum / results.length);
  }

  /**
   * Generate summary from results
   */
  private generateSummary(results: BenchmarkResult[]): SuiteSummary {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter(
      (r) => !r.passed && r.errors.length === 0
    ).length;
    const skipped = results.filter((r) => r.errors.length > 0).length;

    const scoreByDimension: Record<BenchmarkDimension, number> = {
      quality: 0,
      completeness: 0,
      efficiency: 0,
      drift: 0,
      speed: 0,
    };

    const dimensionCounts: Record<BenchmarkDimension, number> = {
      quality: 0,
      completeness: 0,
      efficiency: 0,
      drift: 0,
      speed: 0,
    };

    for (const result of results) {
      for (const [dim, score] of Object.entries(result.scores)) {
        const dimension = dim as BenchmarkDimension;
        if (score > 0) {
          scoreByDimension[dimension] += score;
          dimensionCounts[dimension]++;
        }
      }
    }

    // Calculate averages
    for (const dim of Object.keys(scoreByDimension) as BenchmarkDimension[]) {
      if (dimensionCounts[dim] > 0) {
        scoreByDimension[dim] = Math.round(
          scoreByDimension[dim] / dimensionCounts[dim]
        );
      }
    }

    return {
      total: results.length,
      passed,
      failed,
      skipped,
      averageScore: this.calculateAggregateScore(results),
      scoreByDimension,
    };
  }

  /**
   * Save suite result to disk
   */
  private async saveSuiteResult(result: SuiteResult): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Save as latest
    const latestPath = path.join(this.config.outputDir, "latest.json");
    await fs.writeFile(latestPath, JSON.stringify(result, null, 2));

    // Save timestamped version
    const timestamp = result.executedAt.toISOString().replace(/[:.]/g, "-");
    const timestampedPath = path.join(
      this.config.outputDir,
      `${result.suiteId}-${timestamp}.json`
    );
    await fs.writeFile(timestampedPath, JSON.stringify(result, null, 2));
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BenchmarkRunnerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BenchmarkRunnerConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultRunner: BenchmarkRunner | null = null;

export function getBenchmarkRunner(
  config?: Partial<BenchmarkRunnerConfig>
): BenchmarkRunner {
  if (!defaultRunner) {
    defaultRunner = new BenchmarkRunner(config);
  }
  return defaultRunner;
}

export function resetBenchmarkRunner(): void {
  defaultRunner = null;
}
