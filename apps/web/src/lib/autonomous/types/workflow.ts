/**
 * Workflow types for the autonomous development system.
 * Defines the structure of execution plans and tasks.
 */

import type { ExecutionMode, ExecutionModeConfig } from "./execution-mode";

export type WorkflowStatus =
  | "pending"
  | "planning"
  | "executing"
  | "paused"
  | "completed"
  | "failed"
  | "aborted";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "failed"
  | "skipped";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskSize = "S" | "M" | "L" | "XL";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  size: TaskSize;
  dependencies: string[];
  assignedAgent?: string;
  artifacts: string[];
  acceptanceCriteria: string[];
  files: string[];
  estimatedCost?: number;
  actualCost?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TaskGraph {
  tasks: Map<string, Task>;
  edges: Map<string, string[]>; // task_id -> dependent_task_ids
  parallelGroups: string[][]; // Groups of tasks that can run in parallel
}

export interface WorkflowPlan {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  taskGraph: TaskGraph;
  phases: WorkflowPhase[];
  createdAt: string;
  estimatedDuration?: number;
  estimatedCost?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  tags: string[];
}

export interface WorkflowPhase {
  id: string;
  name: string;
  description: string;
  taskIds: string[];
  order: number;
  requiresApproval: boolean;
}

export interface Workflow {
  id: string;
  plan: WorkflowPlan;
  status: WorkflowStatus;
  config: ExecutionModeConfig;
  currentPhase: string;
  currentTaskId?: string;
  checkpointIds: string[];
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  error?: string;
  resources: WorkflowResources;
  metadata: Record<string, unknown>;
}

export interface WorkflowResources {
  costIncurred: number;
  timeElapsed: number;
  apiCalls: number;
  filesCreated: number;
  filesModified: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

export interface WorkflowEvent {
  id: string;
  workflowId: string;
  timestamp: string;
  type: WorkflowEventType;
  payload: Record<string, unknown>;
  agentId?: string;
  taskId?: string;
}

export type WorkflowEventType =
  | "workflow_started"
  | "workflow_completed"
  | "workflow_failed"
  | "workflow_paused"
  | "workflow_resumed"
  | "workflow_aborted"
  | "phase_started"
  | "phase_completed"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "task_blocked"
  | "checkpoint_created"
  | "checkpoint_restored"
  | "agent_spawned"
  | "agent_terminated"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "cost_threshold_warning"
  | "cost_threshold_exceeded";

export interface CreateWorkflowInput {
  title: string;
  description: string;
  mode?: ExecutionMode;
  budget?: { amount: number; currency: string };
  timeout?: number;
  tags?: string[];
}

export interface WorkflowSummary {
  id: string;
  title: string;
  status: WorkflowStatus;
  progress: number; // 0-100
  currentPhase: string;
  tasksCompleted: number;
  tasksTotal: number;
  startedAt?: string;
  estimatedCompletion?: string;
}

export function createTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createWorkflowId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function calculateProgress(workflow: Workflow): number {
  const tasks = workflow.plan.tasks;
  if (tasks.length === 0) {
    return 0;
  }

  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

export function getNextTasks(workflow: Workflow): Task[] {
  const { tasks } = workflow.plan;
  const completedIds = new Set(
    tasks.filter((t) => t.status === "completed").map((t) => t.id)
  );

  return tasks.filter((task) => {
    if (task.status !== "pending") {
      return false;
    }

    const dependencies = task.dependencies;
    return dependencies.every((depId) => completedIds.has(depId));
  });
}

export function canExecuteTask(task: Task, workflow: Workflow): boolean {
  if (task.status !== "pending") {
    return false;
  }

  const completedIds = new Set(
    workflow.plan.tasks.filter((t) => t.status === "completed").map((t) => t.id)
  );

  return task.dependencies.every((depId) => completedIds.has(depId));
}
