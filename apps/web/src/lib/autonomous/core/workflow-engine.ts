/**
 * Workflow engine for orchestrating autonomous development workflows.
 * Manages plan execution, task scheduling, and state transitions.
 */

import { type FileStorage, getStorage } from "../persistence/file-storage";
import type { Checkpoint } from "../types/checkpoint";
import type {
  ExecutionMode,
  ExecutionModeConfig,
} from "../types/execution-mode";
import { requiresApproval } from "../types/execution-mode";
import type { AgentType } from "../types/message";
import type {
  CreateWorkflowInput,
  Task,
  Workflow,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowPlan,
  WorkflowSummary,
} from "../types/workflow";
import {
  calculateProgress,
  createWorkflowId,
  getNextTasks,
} from "../types/workflow";
import { type AgentRegistry, getAgentRegistry } from "./agent-registry";
import {
  type CheckpointManager,
  getCheckpointManager,
} from "./checkpoint-manager";
import { getMessageBus, type MessageBus } from "./message-bus";

export interface WorkflowEngineConfig {
  storage?: FileStorage;
  checkpointManager?: CheckpointManager;
  messageBus?: MessageBus;
  agentRegistry?: AgentRegistry;
  checkpointInterval?: number; // Tasks between checkpoints
  maxRetries?: number;
  retryDelay?: number;
}

export interface ExecuteOptions {
  dryRun?: boolean;
  startFromTask?: string;
  skipApproval?: boolean;
}

export interface PauseOptions {
  immediate?: boolean;
  reason?: string;
}

export interface ResumeOptions {
  fromCheckpoint?: string;
  skipApproval?: boolean;
}

export class WorkflowEngine {
  private storage: FileStorage;
  private checkpointManager: CheckpointManager;
  private messageBus: MessageBus;
  private agentRegistry: AgentRegistry;
  private checkpointInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private currentWorkflow: Workflow | null;
  private isPaused: boolean;
  private isAborted: boolean;

  constructor(config: WorkflowEngineConfig = {}) {
    this.storage = config.storage ?? getStorage();
    this.checkpointManager = config.checkpointManager ?? getCheckpointManager();
    this.messageBus = config.messageBus ?? getMessageBus();
    this.agentRegistry = config.agentRegistry ?? getAgentRegistry();
    this.checkpointInterval = config.checkpointInterval ?? 5;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.currentWorkflow = null;
    this.isPaused = false;
    this.isAborted = false;
  }

  async create(
    input: CreateWorkflowInput,
    plan: WorkflowPlan
  ): Promise<Workflow> {
    const workflowId = createWorkflowId();
    const now = new Date().toISOString();

    const config: ExecutionModeConfig = {
      mode: input.mode ?? "supervised",
      budget: input.budget,
      timeout: input.timeout,
      autoApprovalLevel: "none",
    };

    const workflow: Workflow = {
      id: workflowId,
      plan: {
        ...plan,
        id: workflowId,
        createdAt: now,
      },
      status: "pending",
      config,
      currentPhase: plan.phases[0]?.id ?? "default",
      checkpointIds: [],
      resources: {
        costIncurred: 0,
        timeElapsed: 0,
        apiCalls: 0,
        filesCreated: 0,
        filesModified: 0,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
      },
      metadata: {
        tags: input.tags ?? [],
        createdAt: now,
      },
    };

    await this.storage.saveWorkflow(workflow);
    this.messageBus.setWorkflowId(workflowId);

    await this.emitEvent(workflow, "workflow_started", {});

    return workflow;
  }

  async load(workflowId: string): Promise<Workflow | null> {
    const workflow = await this.storage.loadWorkflow(workflowId);
    if (workflow) {
      this.currentWorkflow = workflow;
      this.messageBus.setWorkflowId(workflowId);
    }
    return workflow;
  }

  async execute(
    workflowId: string,
    options: ExecuteOptions = {}
  ): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.currentWorkflow = workflow;
    this.isPaused = false;
    this.isAborted = false;

    // Update status
    workflow.status = "executing";
    workflow.startedAt = new Date().toISOString();
    await this.storage.saveWorkflow(workflow);

    if (options.dryRun) {
      return workflow;
    }

    // Create initial checkpoint
    await this.createCheckpoint(workflow, "execution_start");

    // Execute tasks
    await this.executeLoop(workflow, options);

    return workflow;
  }

  private async executeLoop(
    workflow: Workflow,
    options: ExecuteOptions
  ): Promise<void> {
    let tasksSinceCheckpoint = 0;

    while (!this.isPaused && !this.isAborted) {
      // Get next available tasks
      const nextTasks = getNextTasks(workflow);

      if (nextTasks.length === 0) {
        // Check if all tasks are complete
        const allComplete = workflow.plan.tasks.every(
          (t) => t.status === "completed" || t.status === "skipped"
        );

        if (allComplete) {
          workflow.status = "completed";
          workflow.completedAt = new Date().toISOString();
          await this.emitEvent(workflow, "workflow_completed", {});
        } else {
          // Some tasks are blocked
          workflow.status = "failed";
          workflow.error = "Workflow blocked - no executable tasks";
          await this.emitEvent(workflow, "workflow_failed", {
            error: workflow.error,
          });
        }

        break;
      }

      // Execute next task
      const task = nextTasks[0];
      if (!task) {
        break;
      }
      workflow.currentTaskId = task.id;

      try {
        await this.executeTask(workflow, task, options);
        tasksSinceCheckpoint++;

        // Create checkpoint at intervals
        if (tasksSinceCheckpoint >= this.checkpointInterval) {
          await this.createCheckpoint(workflow, `after_task_${task.id}`);
          tasksSinceCheckpoint = 0;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        task.status = "failed";
        task.error = errorMessage;

        if (task.retryCount < task.maxRetries) {
          task.retryCount++;
          task.status = "pending";
          await this.delay(this.retryDelay * task.retryCount);
        } else {
          workflow.status = "failed";
          workflow.error = `Task ${task.id} failed: ${errorMessage}`;
          await this.emitEvent(workflow, "task_failed", {
            taskId: task.id,
            error: errorMessage,
          });
          break;
        }
      }

      await this.storage.saveWorkflow(workflow);
    }

    // Final checkpoint
    await this.createCheckpoint(workflow, "execution_end");
    await this.storage.saveWorkflow(workflow);
  }

  private async executeTask(
    workflow: Workflow,
    task: Task,
    options: ExecuteOptions
  ): Promise<void> {
    // Check if approval is needed
    if (!options.skipApproval) {
      const needsApproval = this.taskRequiresApproval(workflow, task);
      if (needsApproval) {
        await this.emitEvent(workflow, "approval_requested", {
          taskId: task.id,
          reason: "Task requires approval based on execution mode",
        });
        task.status = "blocked";
        return;
      }
    }

    // Update task status
    task.status = "in_progress";
    task.startedAt = new Date().toISOString();
    await this.emitEvent(workflow, "task_started", { taskId: task.id });

    // Find or spawn appropriate agent
    const agentType = this.getAgentTypeForTask(task);
    const agent = this.agentRegistry.findOrSpawn(agentType, workflow.id);
    task.assignedAgent = agent.id;
    this.agentRegistry.assignTask(agent.id, task.id);

    // Simulate task execution (in real implementation, this would delegate to the agent)
    // For now, we mark it as complete
    task.status = "completed";
    task.completedAt = new Date().toISOString();

    this.agentRegistry.completeTask(agent.id);

    await this.emitEvent(workflow, "task_completed", { taskId: task.id });
  }

  private taskRequiresApproval(workflow: Workflow, task: Task): boolean {
    const mode = workflow.config.mode;
    const estimatedCost = task.estimatedCost ?? 0;

    // Check based on task type/priority
    if (task.priority === "critical") {
      return requiresApproval(mode, "destructiveOperations", estimatedCost);
    }

    // Check if it's a deployment task
    if (task.title.toLowerCase().includes("deploy")) {
      const isProd = task.title.toLowerCase().includes("prod");
      return isProd
        ? requiresApproval(mode, "prodDeployments", estimatedCost)
        : requiresApproval(mode, "nonProdDeployments", estimatedCost);
    }

    // Check if it's a testing task
    if (task.title.toLowerCase().includes("test")) {
      return requiresApproval(mode, "testing", estimatedCost);
    }

    return requiresApproval(mode, "planning", estimatedCost);
  }

  private getAgentTypeForTask(task: Task): AgentType {
    const title = task.title.toLowerCase();

    if (title.includes("plan") || title.includes("design")) {
      return "planner";
    }
    if (title.includes("test")) {
      return "tester";
    }
    if (title.includes("review")) {
      return "reviewer";
    }
    if (title.includes("deploy") || title.includes("release")) {
      return "deployer";
    }
    if (title.includes("monitor") || title.includes("observe")) {
      return "observer";
    }
    if (title.includes("incident") || title.includes("respond")) {
      return "responder";
    }

    return "developer";
  }

  async pause(
    workflowId: string,
    options: PauseOptions = {}
  ): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.isPaused = true;
    workflow.status = "paused";
    workflow.pausedAt = new Date().toISOString();

    await this.createCheckpoint(workflow, "paused");
    await this.emitEvent(workflow, "workflow_paused", {
      reason: options.reason,
    });
    await this.storage.saveWorkflow(workflow);

    return workflow;
  }

  async resume(
    workflowId: string,
    options: ResumeOptions = {}
  ): Promise<Workflow> {
    if (options.fromCheckpoint) {
      // Restore from checkpoint
      const result = await this.checkpointManager.restore({
        checkpointId: options.fromCheckpoint,
        restoreFiles: true,
        restoreDatabase: false,
        restoreConfig: true,
        dryRun: false,
      });

      if (!result.success) {
        throw new Error(
          `Failed to restore checkpoint: ${result.errors.join(", ")}`
        );
      }
    }

    const workflow: Workflow | null = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.isPaused = false;
    workflow.status = "executing";
    workflow.pausedAt = undefined;

    await this.emitEvent(workflow, "workflow_resumed", {});
    await this.storage.saveWorkflow(workflow);

    // Continue execution
    await this.executeLoop(workflow, { skipApproval: options.skipApproval });

    return workflow;
  }

  async abort(workflowId: string, reason?: string): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.isAborted = true;
    workflow.status = "aborted";
    workflow.error = reason ?? "Workflow aborted by user";

    await this.createCheckpoint(workflow, "aborted");
    await this.emitEvent(workflow, "workflow_aborted", { reason });
    await this.storage.saveWorkflow(workflow);

    // Terminate all agents for this workflow
    const agents = this.agentRegistry.getByWorkflow(workflowId);
    for (const agent of agents) {
      this.agentRegistry.terminate(agent.id);
    }

    return workflow;
  }

  async rollback(workflowId: string, checkpointId: string): Promise<Workflow> {
    const result = await this.checkpointManager.restore({
      checkpointId,
      restoreFiles: true,
      restoreDatabase: false,
      restoreConfig: true,
      dryRun: false,
    });

    if (!result.success) {
      throw new Error(`Rollback failed: ${result.errors.join(", ")}`);
    }

    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found after rollback: ${workflowId}`);
    }

    await this.emitEvent(workflow, "checkpoint_restored", { checkpointId });

    return workflow;
  }

  async getStatus(workflowId: string): Promise<WorkflowSummary | null> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      return null;
    }

    const completedTasks = workflow.plan.tasks.filter(
      (t) => t.status === "completed"
    ).length;

    return {
      id: workflow.id,
      title: workflow.plan.title,
      status: workflow.status,
      progress: calculateProgress(workflow),
      currentPhase: workflow.currentPhase,
      tasksCompleted: completedTasks,
      tasksTotal: workflow.plan.tasks.length,
      startedAt: workflow.startedAt,
    };
  }

  async list(): Promise<WorkflowSummary[]> {
    return this.storage.listWorkflows();
  }

  async setMode(workflowId: string, mode: ExecutionMode): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.config.mode = mode;
    await this.storage.saveWorkflow(workflow);

    return workflow;
  }

  async setBudget(
    workflowId: string,
    amount: number,
    currency: string
  ): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.config.budget = { amount, currency };
    await this.storage.saveWorkflow(workflow);

    return workflow;
  }

  async setTimeout(workflowId: string, timeout: number): Promise<Workflow> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.config.timeout = timeout;
    await this.storage.saveWorkflow(workflow);

    return workflow;
  }

  async approveTask(workflowId: string, taskId: string): Promise<void> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const task = workflow.plan.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === "blocked") {
      task.status = "pending";
      await this.emitEvent(workflow, "approval_granted", { taskId });
      await this.storage.saveWorkflow(workflow);
    }
  }

  async denyTask(
    workflowId: string,
    taskId: string,
    reason?: string
  ): Promise<void> {
    const workflow = await this.load(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const task = workflow.plan.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = "skipped";
    task.error = reason ?? "Approval denied";
    await this.emitEvent(workflow, "approval_denied", { taskId, reason });
    await this.storage.saveWorkflow(workflow);
  }

  private async createCheckpoint(
    workflow: Workflow,
    phase: string
  ): Promise<Checkpoint> {
    const checkpoint = await this.checkpointManager.createFromWorkflowState(
      workflow.id,
      phase,
      workflow.currentTaskId ?? "",
      workflow.plan.tasks
        .filter((t) => t.status === "completed")
        .map((t) => t.id),
      workflow.plan.tasks
        .filter((t) => t.status === "pending")
        .map((t) => t.id),
      workflow.plan.tasks
        .filter((t) => t.status === "blocked")
        .map((t) => t.id),
      {},
      this.agentRegistry.toAgentStates(),
      {
        costIncurred: workflow.resources.costIncurred,
        timeElapsed: workflow.resources.timeElapsed,
        apiCalls: workflow.resources.apiCalls,
      }
    );

    workflow.checkpointIds.push(checkpoint.id);
    await this.emitEvent(workflow, "checkpoint_created", {
      checkpointId: checkpoint.id,
    });

    return checkpoint;
  }

  private async emitEvent(
    workflow: Workflow,
    type: WorkflowEventType,
    payload: Record<string, unknown>
  ): Promise<void> {
    const event: WorkflowEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      workflowId: workflow.id,
      timestamp: new Date().toISOString(),
      type,
      payload,
      taskId: workflow.currentTaskId,
    };

    await this.storage.saveEvent(event);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCurrentWorkflow(): Workflow | null {
    return this.currentWorkflow;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  isAbortedState(): boolean {
    return this.isAborted;
  }
}

// Singleton instance
let defaultEngine: WorkflowEngine | null = null;

export function getWorkflowEngine(
  config?: WorkflowEngineConfig
): WorkflowEngine {
  if (!defaultEngine) {
    defaultEngine = new WorkflowEngine(config);
  }
  return defaultEngine;
}

export function resetWorkflowEngine(): void {
  defaultEngine = null;
}
