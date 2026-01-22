/**
 * Trigger Engine for automated actions.
 * Handles scheduled, threshold-based, and event-driven automation.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import type {
  CronSchedule,
  ThresholdCondition,
  Trigger,
  TriggerEngineConfig,
  TriggerExecution,
} from "../types/trigger";
import { BUILTIN_TRIGGERS, DEFAULT_TRIGGER_CONFIG } from "../types/trigger";

/**
 * Simple cron parser for basic expressions
 */
function parseCronExpression(expression: string): {
  minute: number | "*";
  hour: number | "*";
  dayOfMonth: number | "*";
  month: number | "*";
  dayOfWeek: number | "*";
} {
  const parts = expression.split(" ");
  return {
    minute: parts[0] === "*" ? "*" : Number.parseInt(parts[0] || "0", 10),
    hour: parts[1] === "*" ? "*" : Number.parseInt(parts[1] || "0", 10),
    dayOfMonth: parts[2] === "*" ? "*" : Number.parseInt(parts[2] || "1", 10),
    month: parts[3] === "*" ? "*" : Number.parseInt(parts[3] || "1", 10),
    dayOfWeek: parts[4] === "*" ? "*" : Number.parseInt(parts[4] || "0", 10),
  };
}

/**
 * Check if cron matches current time
 */
function cronMatches(
  cron: ReturnType<typeof parseCronExpression>,
  date: Date
): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  return (
    (cron.minute === "*" || cron.minute === minute) &&
    (cron.hour === "*" || cron.hour === hour) &&
    (cron.dayOfMonth === "*" || cron.dayOfMonth === dayOfMonth) &&
    (cron.month === "*" || cron.month === month) &&
    (cron.dayOfWeek === "*" || cron.dayOfWeek === dayOfWeek)
  );
}

/**
 * Trigger Engine for the autonomous system
 */
export class TriggerEngine {
  private config: TriggerEngineConfig;
  private triggers: Map<string, Trigger>;
  private executions: TriggerExecution[];
  private metricValues: Map<string, { value: number; since: number }>;
  private isRunning: boolean;
  private checkTimer: ReturnType<typeof setInterval> | null;
  private lastMinuteChecked: number;

  constructor(config: Partial<TriggerEngineConfig> = {}) {
    this.config = { ...DEFAULT_TRIGGER_CONFIG, ...config };
    this.triggers = new Map();
    this.executions = [];
    this.metricValues = new Map();
    this.isRunning = false;
    this.checkTimer = null;
    this.lastMinuteChecked = -1;

    // Load built-in triggers
    this.loadBuiltinTriggers();
  }

  /**
   * Load built-in triggers
   */
  private loadBuiltinTriggers(): void {
    const now = new Date();
    for (const trigger of BUILTIN_TRIGGERS) {
      this.triggers.set(trigger.id, {
        ...trigger,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * Start the trigger engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Load persisted state
    await this.loadState();

    // Set up check interval
    this.checkTimer = setInterval(
      () => this.checkTriggers(),
      this.config.checkInterval
    );

    // Initial check
    await this.checkTriggers();
  }

  /**
   * Stop the trigger engine
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Check all triggers
   */
  async checkTriggers(): Promise<TriggerExecution[]> {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const executions: TriggerExecution[] = [];

    for (const [_id, trigger] of this.triggers) {
      if (!trigger.enabled) {
        continue;
      }

      let shouldExecute = false;

      switch (trigger.condition.type) {
        case "scheduled":
          // Only check once per minute
          if (currentMinute !== this.lastMinuteChecked) {
            shouldExecute = this.checkScheduledTrigger(
              trigger.condition.schedule,
              now
            );
          }
          break;

        case "threshold":
          shouldExecute = this.checkThresholdTrigger(
            trigger.condition.threshold
          );
          break;

        case "event":
          // Events are checked when they arrive via onEvent
          break;
      }

      if (shouldExecute) {
        const execution = await this.executeTrigger(trigger);
        executions.push(execution);
      }
    }

    this.lastMinuteChecked = currentMinute;

    return executions;
  }

  /**
   * Check if scheduled trigger should fire
   */
  private checkScheduledTrigger(schedule: CronSchedule, now: Date): boolean {
    const cron = parseCronExpression(schedule.expression);
    return cronMatches(cron, now);
  }

  /**
   * Check if threshold trigger should fire
   */
  private checkThresholdTrigger(threshold: ThresholdCondition): boolean {
    const metricState = this.metricValues.get(threshold.metric);
    if (!metricState) {
      return false;
    }

    const { value, since } = metricState;
    let conditionMet = false;

    switch (threshold.operator) {
      case "gt":
        conditionMet = value > threshold.value;
        break;
      case "gte":
        conditionMet = value >= threshold.value;
        break;
      case "lt":
        conditionMet = value < threshold.value;
        break;
      case "lte":
        conditionMet = value <= threshold.value;
        break;
      case "eq":
        conditionMet = value === threshold.value;
        break;
      case "neq":
        conditionMet = value !== threshold.value;
        break;
    }

    // Check duration requirement
    if (conditionMet && threshold.duration) {
      const duration = Date.now() - since;
      return duration >= threshold.duration;
    }

    return conditionMet;
  }

  /**
   * Execute a trigger
   */
  async executeTrigger(trigger: Trigger): Promise<TriggerExecution> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let result: Record<string, unknown> | undefined;
    let retryCount = 0;

    const maxAttempts = trigger.action.retry?.maxAttempts ?? 1;
    const retryDelay = trigger.action.retry?.delay ?? 1000;

    while (retryCount < maxAttempts) {
      try {
        result = await this.executeAction(trigger);
        success = true;
        break;
      } catch (e) {
        retryCount++;
        error = e instanceof Error ? e.message : String(e);

        if (retryCount < maxAttempts) {
          const delay =
            trigger.action.retry?.backoff === "exponential"
              ? retryDelay * 2 ** (retryCount - 1)
              : retryDelay * retryCount;

          await this.sleep(delay);
        }
      }
    }

    const execution: TriggerExecution = {
      triggerId: trigger.id,
      executedAt: new Date(),
      success,
      duration: Date.now() - startTime,
      result,
      error,
      retryCount,
    };

    this.executions.push(execution);
    await this.persistExecution(execution);

    return execution;
  }

  /**
   * Execute trigger action
   */
  private async executeAction(
    trigger: Trigger
  ): Promise<Record<string, unknown>> {
    const { action } = trigger;

    switch (action.type) {
      case "run-benchmark":
        console.log(
          `[TriggerEngine] Running benchmark suite: ${action.params.suite}`
        );
        return { benchmarkSuite: action.params.suite };

      case "extract-learnings":
        console.log(
          `[TriggerEngine] Extracting learnings from last ${action.params.lookback} days`
        );
        return { lookback: action.params.lookback };

      case "spawn-agent":
        console.log(
          `[TriggerEngine] Spawning agent: ${action.params.agentType}`
        );
        return {
          agentType: action.params.agentType,
          task: action.params.task,
        };

      case "create-workflow":
        console.log(
          `[TriggerEngine] Creating workflow: ${action.params.workflowId}`
        );
        return { workflowId: action.params.workflowId };

      case "send-notification":
        console.log(
          `[TriggerEngine] Sending notification: ${action.params.message}`
        );
        return { message: action.params.message };

      case "evolve-config":
        console.log(`[TriggerEngine] Evolving config: ${action.params.target}`);
        return { target: action.params.target };

      default:
        return {};
    }
  }

  /**
   * Update a metric value for threshold triggers
   */
  updateMetric(metric: string, value: number): void {
    const existing = this.metricValues.get(metric);

    if (existing) {
      // Check if value crossed threshold (reset timer)
      if (Math.sign(value) !== Math.sign(existing.value)) {
        this.metricValues.set(metric, { value, since: Date.now() });
      } else {
        // Update value, keep timer
        this.metricValues.set(metric, { value, since: existing.since });
      }
    } else {
      this.metricValues.set(metric, { value, since: Date.now() });
    }
  }

  /**
   * Handle an event for event triggers
   */
  async onEvent(
    eventType: string,
    source: string,
    payload: Record<string, unknown>
  ): Promise<TriggerExecution[]> {
    const executions: TriggerExecution[] = [];

    for (const [_id, trigger] of this.triggers) {
      if (!trigger.enabled || trigger.condition.type !== "event") {
        continue;
      }

      const filter = trigger.condition.filter;

      // Check event type
      if (filter.eventType !== eventType) {
        continue;
      }

      // Check source
      if (filter.source && filter.source !== source) {
        continue;
      }

      // Check payload filters
      if (filter.payloadFilters) {
        let matches = true;
        for (const [key, expected] of Object.entries(filter.payloadFilters)) {
          if (payload[key] !== expected) {
            matches = false;
            break;
          }
        }
        if (!matches) {
          continue;
        }
      }

      const execution = await this.executeTrigger(trigger);
      executions.push(execution);
    }

    return executions;
  }

  /**
   * Add a trigger
   */
  addTrigger(trigger: Omit<Trigger, "createdAt" | "updatedAt">): void {
    const now = new Date();
    this.triggers.set(trigger.id, {
      ...trigger,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Remove a trigger
   */
  removeTrigger(triggerId: string): void {
    this.triggers.delete(triggerId);
  }

  /**
   * Enable/disable a trigger
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): void {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      trigger.updatedAt = new Date();
    }
  }

  /**
   * Get all triggers
   */
  getTriggers(): Trigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get recent executions
   */
  getExecutions(limit = 100): TriggerExecution[] {
    return this.executions.slice(-limit);
  }

  /**
   * Load persisted state
   */
  private async loadState(): Promise<void> {
    try {
      const statePath = path.join(this.config.stateDir, "triggers-state.json");
      const content = await fs.readFile(statePath, "utf-8");
      const state = JSON.parse(content);

      // Load custom triggers
      for (const trigger of state.triggers || []) {
        if (!BUILTIN_TRIGGERS.some((b) => b.id === trigger.id)) {
          this.triggers.set(trigger.id, {
            ...trigger,
            createdAt: new Date(trigger.createdAt),
            updatedAt: new Date(trigger.updatedAt),
          });
        }
      }

      // Load executions
      for (const exec of state.executions || []) {
        this.executions.push({
          ...exec,
          executedAt: new Date(exec.executedAt),
        });
      }
    } catch {
      // No state file, start fresh
    }
  }

  /**
   * Persist an execution
   */
  private async persistExecution(execution: TriggerExecution): Promise<void> {
    try {
      await fs.mkdir(this.config.stateDir, { recursive: true });

      const logPath = path.join(this.config.stateDir, "executions.jsonl");
      const line = JSON.stringify({
        ...execution,
        executedAt: execution.executedAt.toISOString(),
      });

      await fs.appendFile(logPath, `${line}\n`);
    } catch (error) {
      console.error("Error persisting trigger execution:", error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TriggerEngineConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if interval changed
    if (this.isRunning && config.checkInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TriggerEngineConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultEngine: TriggerEngine | null = null;

export function getTriggerEngine(
  config?: Partial<TriggerEngineConfig>
): TriggerEngine {
  if (!defaultEngine) {
    defaultEngine = new TriggerEngine(config);
  }
  return defaultEngine;
}

export function resetTriggerEngine(): void {
  if (defaultEngine) {
    defaultEngine.stop();
  }
  defaultEngine = null;
}
