/**
 * Checkpoint types for state persistence and rollback.
 * Based on the checkpoint schema from the project specification.
 */

import type { Artifact } from "./message";
import type { TaskStatus } from "./workflow";

export interface Checkpoint {
  id: string;
  workflowId: string;
  timestamp: string;
  phase: string;
  taskId: string;
  state: CheckpointState;
  agents: CheckpointAgents;
  resources: CheckpointResources;
  rollback: RollbackInfo;
  metadata?: Record<string, unknown>;
}

export interface CheckpointState {
  completedTasks: string[];
  pendingTasks: string[];
  blockedTasks: string[];
  artifacts: Record<string, Artifact>;
  taskStatuses: Record<string, TaskStatus>;
  variables: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  type: string;
  status: "idle" | "busy" | "waiting" | "error";
  currentTaskId?: string;
  lastActivity: string;
  messageCount: number;
  errorCount: number;
  metadata?: Record<string, unknown>;
}

export interface CheckpointAgents {
  active: AgentState[];
  terminated: string[];
}

export interface CheckpointResources {
  costIncurred: number;
  timeElapsed: number;
  apiCalls: number;
  tokensUsed?: number;
  filesChanged: number;
}

export interface RollbackInfo {
  filesBackup: string; // Path to tar.gz backup
  dbSnapshot?: string; // Path to database snapshot
  configSnapshot: Record<string, unknown>;
  gitCommit?: string; // Git commit hash at checkpoint time
  canRollback: boolean;
  rollbackNotes?: string;
}

export interface CheckpointSummary {
  id: string;
  workflowId: string;
  timestamp: string;
  phase: string;
  taskId: string;
  completedTaskCount: number;
  pendingTaskCount: number;
  costIncurred: number;
  canRollback: boolean;
}

export interface CheckpointDiff {
  fromCheckpoint: string;
  toCheckpoint: string;
  tasksCompleted: string[];
  tasksAdded: string[];
  tasksRemoved: string[];
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  costDelta: number;
  timeDelta: number;
}

export interface CreateCheckpointInput {
  workflowId: string;
  phase: string;
  taskId: string;
  state: Partial<CheckpointState>;
  agents: CheckpointAgents;
  resources: CheckpointResources;
  createBackup?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RestoreCheckpointOptions {
  checkpointId: string;
  restoreFiles: boolean;
  restoreDatabase: boolean;
  restoreConfig: boolean;
  dryRun: boolean;
}

export interface RestoreCheckpointResult {
  success: boolean;
  checkpointId: string;
  restoredAt: string;
  filesRestored: number;
  databaseRestored: boolean;
  configRestored: boolean;
  errors: string[];
  warnings: string[];
}

export function createCheckpointId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function checkpointToSummary(checkpoint: Checkpoint): CheckpointSummary {
  return {
    id: checkpoint.id,
    workflowId: checkpoint.workflowId,
    timestamp: checkpoint.timestamp,
    phase: checkpoint.phase,
    taskId: checkpoint.taskId,
    completedTaskCount: checkpoint.state.completedTasks.length,
    pendingTaskCount: checkpoint.state.pendingTasks.length,
    costIncurred: checkpoint.resources.costIncurred,
    canRollback: checkpoint.rollback.canRollback,
  };
}

export function diffCheckpoints(
  from: Checkpoint,
  to: Checkpoint
): CheckpointDiff {
  const fromCompleted = new Set(from.state.completedTasks);
  const toCompleted = new Set(to.state.completedTasks);
  const fromPending = new Set(from.state.pendingTasks);
  const toPending = new Set(to.state.pendingTasks);

  const tasksCompleted = [...toCompleted].filter((t) => !fromCompleted.has(t));

  const allFromTasks = new Set([...fromCompleted, ...fromPending]);
  const allToTasks = new Set([...toCompleted, ...toPending]);

  const tasksAdded = [...allToTasks].filter((t) => !allFromTasks.has(t));
  const tasksRemoved = [...allFromTasks].filter((t) => !allToTasks.has(t));

  const fromArtifacts = new Set(Object.keys(from.state.artifacts));
  const toArtifacts = new Set(Object.keys(to.state.artifacts));

  const filesCreated = [...toArtifacts].filter((f) => !fromArtifacts.has(f));
  const filesDeleted = [...fromArtifacts].filter((f) => !toArtifacts.has(f));
  const filesModified: string[] = []; // Would need deeper comparison

  return {
    fromCheckpoint: from.id,
    toCheckpoint: to.id,
    tasksCompleted,
    tasksAdded,
    tasksRemoved,
    filesCreated,
    filesModified,
    filesDeleted,
    costDelta: to.resources.costIncurred - from.resources.costIncurred,
    timeDelta: to.resources.timeElapsed - from.resources.timeElapsed,
  };
}

export function validateCheckpoint(checkpoint: Checkpoint): string[] {
  const errors: string[] = [];

  if (!checkpoint.id) {
    errors.push("Checkpoint ID is required");
  }

  if (!checkpoint.workflowId) {
    errors.push("Workflow ID is required");
  }

  if (!checkpoint.timestamp) {
    errors.push("Timestamp is required");
  }

  if (!checkpoint.phase) {
    errors.push("Phase is required");
  }

  if (!checkpoint.state) {
    errors.push("State is required");
  } else {
    if (!Array.isArray(checkpoint.state.completedTasks)) {
      errors.push("completedTasks must be an array");
    }
    if (!Array.isArray(checkpoint.state.pendingTasks)) {
      errors.push("pendingTasks must be an array");
    }
    if (!Array.isArray(checkpoint.state.blockedTasks)) {
      errors.push("blockedTasks must be an array");
    }
  }

  if (!checkpoint.rollback) {
    errors.push("Rollback info is required");
  } else {
    if (!checkpoint.rollback.filesBackup) {
      errors.push("Files backup path is required");
    }
  }

  return errors;
}

export function isCheckpointValid(checkpoint: Checkpoint): boolean {
  return validateCheckpoint(checkpoint).length === 0;
}
