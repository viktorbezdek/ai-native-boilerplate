/**
 * Autonomous Development System
 *
 * A complete architecture for self-developing products with:
 * - Confidence-gated autonomous decisions
 * - Benchmark-driven configuration evolution
 * - Automated signal processing and pattern detection
 * - Closed-loop feedback system
 *
 * @module @repo/autonomous
 */

// Benchmarks
export * from "./benchmarks";

// Engines
export * from "./engines";
// Orchestrator
export {
  AutonomousOrchestrator,
  getOrchestrator,
  resetOrchestrator,
} from "./orchestrator";

// Signals
export * from "./signals";
// Types
export * from "./types";
