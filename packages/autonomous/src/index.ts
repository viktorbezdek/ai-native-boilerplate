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

// Types
export * from "./types";

// Engines
export * from "./engines";

// Benchmarks
export * from "./benchmarks";

// Signals
export * from "./signals";

// Orchestrator
export {
  AutonomousOrchestrator,
  getOrchestrator,
  resetOrchestrator,
} from "./orchestrator";
