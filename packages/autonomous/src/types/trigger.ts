/**
 * Trigger types for automated actions.
 * Enables scheduled, threshold-based, and event-driven automation.
 */

import { z } from "zod";

/**
 * Types of triggers
 */
export const TriggerTypeSchema = z.enum(["scheduled", "threshold", "event"]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

/**
 * Cron schedule for scheduled triggers
 */
export interface CronSchedule {
  /** Cron expression (e.g., "0 2 * * *" for 2 AM daily) */
  expression: string;
  /** Timezone for the schedule */
  timezone: string;
}

/**
 * Threshold condition for threshold triggers
 */
export interface ThresholdCondition {
  /** Metric to monitor */
  metric: string;
  /** Comparison operator */
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  /** Threshold value */
  value: number;
  /** Duration the condition must be true (ms) */
  duration?: number;
}

/**
 * Event filter for event triggers
 */
export interface EventFilter {
  /** Event type to match */
  eventType: string;
  /** Source to filter on */
  source?: string;
  /** Payload filters */
  payloadFilters?: Record<string, unknown>;
}

/**
 * Union type for trigger conditions
 */
export type TriggerCondition =
  | { type: "scheduled"; schedule: CronSchedule }
  | { type: "threshold"; threshold: ThresholdCondition }
  | { type: "event"; filter: EventFilter };

/**
 * Action to take when trigger fires
 */
export type TriggerActionType =
  | "run-benchmark"
  | "extract-learnings"
  | "spawn-agent"
  | "create-workflow"
  | "send-notification"
  | "evolve-config";

/**
 * Trigger action configuration
 */
export interface TriggerAction {
  type: TriggerActionType;
  /** Parameters for the action */
  params: Record<string, unknown>;
  /** Timeout for action execution (ms) */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoff: "linear" | "exponential";
    delay: number;
  };
}

/**
 * A trigger definition
 */
export interface Trigger {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this trigger does */
  description: string;
  /** Type of trigger */
  type: TriggerType;
  /** Condition for firing */
  condition: TriggerCondition;
  /** Action to take when fired */
  action: TriggerAction;
  /** Whether the trigger is enabled */
  enabled: boolean;
  /** Tags for organization */
  tags: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
}

/**
 * Result of a trigger execution
 */
export interface TriggerExecution {
  /** Trigger ID */
  triggerId: string;
  /** Execution timestamp */
  executedAt: Date;
  /** Whether execution succeeded */
  success: boolean;
  /** Duration of execution (ms) */
  duration: number;
  /** Result data */
  result?: Record<string, unknown>;
  /** Error if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Trigger engine configuration
 */
export interface TriggerEngineConfig {
  /** Directory to store trigger state */
  stateDir: string;
  /** How often to check scheduled triggers (ms) */
  checkInterval: number;
  /** Maximum concurrent trigger executions */
  concurrency: number;
  /** Default timeout for actions (ms) */
  defaultTimeout: number;
}

/**
 * Default trigger engine configuration
 */
export const DEFAULT_TRIGGER_CONFIG: TriggerEngineConfig = {
  stateDir: ".claude/logs/triggers",
  checkInterval: 60000,
  concurrency: 5,
  defaultTimeout: 300000,
};

/**
 * Built-in trigger definitions
 */
export const BUILTIN_TRIGGERS: Omit<Trigger, "createdAt" | "updatedAt">[] = [
  {
    id: "nightly-benchmark",
    name: "Nightly Benchmark",
    description: "Run benchmark suite every night at 2 AM",
    type: "scheduled",
    condition: {
      type: "scheduled",
      schedule: {
        expression: "0 2 * * *",
        timezone: "UTC",
      },
    },
    action: {
      type: "run-benchmark",
      params: {
        suite: "full",
      },
    },
    enabled: true,
    tags: ["benchmark", "nightly"],
  },
  {
    id: "high-drift-alert",
    name: "High Drift Alert",
    description: "Alert when drift score exceeds 30",
    type: "threshold",
    condition: {
      type: "threshold",
      threshold: {
        metric: "drift.score",
        operator: "gt",
        value: 30,
        duration: 300000, // 5 minutes
      },
    },
    action: {
      type: "spawn-agent",
      params: {
        agentType: "reviewer",
        task: "Investigate drift and recommend corrections",
      },
    },
    enabled: true,
    tags: ["drift", "quality"],
  },
  {
    id: "weekly-learning",
    name: "Weekly Learning Extraction",
    description: "Extract learnings every Sunday at midnight",
    type: "scheduled",
    condition: {
      type: "scheduled",
      schedule: {
        expression: "0 0 * * 0",
        timezone: "UTC",
      },
    },
    action: {
      type: "extract-learnings",
      params: {
        lookback: 7, // days
      },
    },
    enabled: true,
    tags: ["learning", "weekly"],
  },
];

/**
 * Zod schemas for validation
 */
export const TriggerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: TriggerTypeSchema,
  condition: z.union([
    z.object({
      type: z.literal("scheduled"),
      schedule: z.object({
        expression: z.string(),
        timezone: z.string(),
      }),
    }),
    z.object({
      type: z.literal("threshold"),
      threshold: z.object({
        metric: z.string(),
        operator: z.enum(["gt", "gte", "lt", "lte", "eq", "neq"]),
        value: z.number(),
        duration: z.number().optional(),
      }),
    }),
    z.object({
      type: z.literal("event"),
      filter: z.object({
        eventType: z.string(),
        source: z.string().optional(),
        payloadFilters: z.record(z.string(), z.unknown()).optional(),
      }),
    }),
  ]),
  action: z.object({
    type: z.enum([
      "run-benchmark",
      "extract-learnings",
      "spawn-agent",
      "create-workflow",
      "send-notification",
      "evolve-config",
    ]),
    params: z.record(z.string(), z.unknown()),
    timeout: z.number().optional(),
    retry: z
      .object({
        maxAttempts: z.number(),
        backoff: z.enum(["linear", "exponential"]),
        delay: z.number(),
      })
      .optional(),
  }),
  enabled: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
