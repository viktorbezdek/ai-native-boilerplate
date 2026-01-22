/**
 * Signal types for the signal processing pipeline.
 * Handles ingestion, aggregation, analysis, and routing of signals.
 */

import { z } from "zod";

/**
 * Priority levels for signals
 */
export const SignalPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export type SignalPriority = z.infer<typeof SignalPrioritySchema>;

/**
 * Types of signals
 */
export const SignalTypeSchema = z.enum(["error", "metric", "event", "alert"]);

export type SignalType = z.infer<typeof SignalTypeSchema>;

/**
 * Signal sources (external systems)
 */
export const SignalSourceTypeSchema = z.enum([
  "sentry",
  "posthog",
  "vercel",
  "local",
  "github",
  "stripe",
]);

export type SignalSourceType = z.infer<typeof SignalSourceTypeSchema>;

/**
 * A signal from an external or internal source
 */
export interface Signal {
  /** Unique identifier */
  id: string;
  /** Type of signal */
  type: SignalType;
  /** Source system */
  source: SignalSourceType;
  /** Priority level */
  priority: SignalPriority;
  /** When the signal was generated */
  timestamp: Date;
  /** Signal payload */
  payload: Record<string, unknown>;
  /** Tags for filtering and routing */
  tags: string[];
  /** Whether this signal has been processed */
  processed: boolean;
  /** Associated workflow ID if any */
  workflowId?: string;
}

/**
 * Action to take when a pattern is matched
 */
export type SignalActionType =
  | "spawn-agent"
  | "notify"
  | "create-task"
  | "trigger-workflow"
  | "escalate"
  | "log";

/**
 * Action configuration for signal patterns
 */
export interface SignalAction {
  type: SignalActionType;
  /** Agent type to spawn (if spawn-agent) */
  agentType?: string;
  /** Task to create (if create-task) */
  taskConfig?: {
    title: string;
    description: string;
    priority: string;
  };
  /** Workflow to trigger (if trigger-workflow) */
  workflowId?: string;
  /** Notification config (if notify) */
  notifyConfig?: {
    channel: string;
    message: string;
  };
  /** Additional action parameters */
  params?: Record<string, unknown>;
}

/**
 * Pattern for matching signals
 */
export interface SignalPattern {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this pattern detects */
  description: string;
  /** Condition function to evaluate signals */
  condition: (signals: Signal[]) => boolean;
  /** Action to take when pattern matches */
  action: SignalAction;
  /** Cooldown period before pattern can match again (ms) */
  cooldown: number;
  /** Whether this pattern is enabled */
  enabled: boolean;
  /** Priority for pattern matching order */
  priority: number;
  /** Tags for organization */
  tags: string[];
}

/**
 * Result of pattern evaluation
 */
export interface PatternMatch {
  patternId: string;
  matchedSignals: Signal[];
  matchedAt: Date;
  action: SignalAction;
}

/**
 * Aggregated signal metrics
 */
export interface SignalMetrics {
  /** Total signals received */
  total: number;
  /** Signals by type */
  byType: Record<SignalType, number>;
  /** Signals by source */
  bySource: Record<SignalSourceType, number>;
  /** Signals by priority */
  byPriority: Record<SignalPriority, number>;
  /** Processing latency stats */
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
  };
  /** Time window for these metrics */
  window: {
    start: Date;
    end: Date;
  };
}

/**
 * Signal adapter interface
 */
export interface SignalAdapter {
  /** Source type this adapter handles */
  source: SignalSourceType;
  /** Poll for new signals */
  poll(): Promise<Signal[]>;
  /** Subscribe to real-time signals (optional) */
  subscribe?(callback: (signal: Signal) => void): () => void;
  /** Test connection to source */
  testConnection(): Promise<boolean>;
  /** Get adapter health status */
  getHealth(): Promise<AdapterHealth>;
}

/**
 * Adapter health status
 */
export interface AdapterHealth {
  source: SignalSourceType;
  healthy: boolean;
  lastPoll?: Date;
  lastError?: string;
  signalsReceived: number;
  errorRate: number;
}

/**
 * Configuration for signal processor
 */
export interface SignalProcessorConfig {
  /** Adapters to use */
  adapters: SignalSourceType[];
  /** Poll interval (ms) */
  pollInterval: number;
  /** Maximum signals to process per cycle */
  batchSize: number;
  /** Signal retention period (ms) */
  retentionPeriod: number;
  /** Patterns to evaluate */
  patterns: SignalPattern[];
  /** Path to store signal logs */
  logsPath: string;
}

/**
 * Default signal processor configuration
 */
export const DEFAULT_SIGNAL_PROCESSOR_CONFIG: SignalProcessorConfig = {
  adapters: ["local"],
  pollInterval: 30000,
  batchSize: 100,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  patterns: [],
  logsPath: ".claude/logs/signals",
};

/**
 * Zod schemas for validation
 */
export const SignalSchema = z.object({
  id: z.string(),
  type: SignalTypeSchema,
  source: SignalSourceTypeSchema,
  priority: SignalPrioritySchema,
  timestamp: z.date(),
  payload: z.record(z.unknown()),
  tags: z.array(z.string()),
  processed: z.boolean(),
  workflowId: z.string().optional(),
});

export const SignalActionSchema = z.object({
  type: z.enum([
    "spawn-agent",
    "notify",
    "create-task",
    "trigger-workflow",
    "escalate",
    "log",
  ]),
  agentType: z.string().optional(),
  taskConfig: z
    .object({
      title: z.string(),
      description: z.string(),
      priority: z.string(),
    })
    .optional(),
  workflowId: z.string().optional(),
  params: z.record(z.unknown()).optional(),
});
