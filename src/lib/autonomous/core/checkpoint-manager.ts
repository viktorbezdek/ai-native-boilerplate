/**
 * Checkpoint manager for creating, restoring, and managing workflow checkpoints.
 * Enables state persistence and rollback capabilities.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { type FileStorage, getStorage } from "../persistence/file-storage";
import type {
  AgentState,
  Checkpoint,
  CheckpointDiff,
  CheckpointSummary,
  CreateCheckpointInput,
  RestoreCheckpointOptions,
  RestoreCheckpointResult,
} from "../types/checkpoint";
import { createCheckpointId, diffCheckpoints } from "../types/checkpoint";
import type { Artifact } from "../types/message";

export interface CheckpointManagerConfig {
  storage?: FileStorage;
  autoBackup?: boolean;
  backupPaths?: string[];
}

export class CheckpointManager {
  private storage: FileStorage;
  private autoBackup: boolean;
  private backupPaths: string[];

  constructor(config: CheckpointManagerConfig = {}) {
    this.storage = config.storage ?? getStorage();
    this.autoBackup = config.autoBackup ?? true;
    this.backupPaths = config.backupPaths ?? ["src", "tests"];
  }

  async create(input: CreateCheckpointInput): Promise<Checkpoint> {
    const checkpointId = createCheckpointId();
    const timestamp = new Date().toISOString();

    // Get current git commit if available
    let gitCommit: string | undefined;
    try {
      gitCommit = execSync("git rev-parse HEAD", { stdio: "pipe" })
        .toString()
        .trim();
    } catch {
      // Git not available or not in a repo
    }

    // Create backup if enabled
    let filesBackup = "";
    if (this.autoBackup && input.createBackup !== false) {
      filesBackup = await this.storage.createBackup(
        input.workflowId,
        checkpointId,
        this.backupPaths
      );
    }

    const checkpoint: Checkpoint = {
      id: checkpointId,
      workflowId: input.workflowId,
      timestamp,
      phase: input.phase,
      taskId: input.taskId,
      state: {
        completedTasks: input.state.completedTasks ?? [],
        pendingTasks: input.state.pendingTasks ?? [],
        blockedTasks: input.state.blockedTasks ?? [],
        artifacts: input.state.artifacts ?? {},
        taskStatuses: input.state.taskStatuses ?? {},
        variables: input.state.variables ?? {},
      },
      agents: input.agents,
      resources: input.resources,
      rollback: {
        filesBackup,
        configSnapshot: {},
        gitCommit,
        canRollback: !!filesBackup || !!gitCommit,
      },
      metadata: input.metadata,
    };

    await this.storage.saveCheckpoint(checkpoint);

    return checkpoint;
  }

  async get(
    workflowId: string,
    checkpointId: string
  ): Promise<Checkpoint | null> {
    return this.storage.loadCheckpoint(workflowId, checkpointId);
  }

  async getLatest(workflowId: string): Promise<Checkpoint | null> {
    return this.storage.getLatestCheckpoint(workflowId);
  }

  async list(workflowId: string): Promise<CheckpointSummary[]> {
    return this.storage.listCheckpoints(workflowId);
  }

  async restore(
    options: RestoreCheckpointOptions
  ): Promise<RestoreCheckpointResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let filesRestored = 0;
    let databaseRestored = false;
    let configRestored = false;

    // Load the checkpoint
    const checkpoints = await this.list(
      options.checkpointId.split("_")[0] ?? ""
    );
    let checkpoint: Checkpoint | null = null;

    // Try to find the checkpoint in any workflow
    const workflows = await this.storage.listWorkflows();
    for (const workflow of workflows) {
      const cp = await this.storage.loadCheckpoint(
        workflow.id,
        options.checkpointId
      );
      if (cp) {
        checkpoint = cp;
        break;
      }
    }

    if (!checkpoint) {
      return {
        success: false,
        checkpointId: options.checkpointId,
        restoredAt: new Date().toISOString(),
        filesRestored: 0,
        databaseRestored: false,
        configRestored: false,
        errors: [`Checkpoint not found: ${options.checkpointId}`],
        warnings: [],
      };
    }

    if (!checkpoint.rollback.canRollback) {
      return {
        success: false,
        checkpointId: options.checkpointId,
        restoredAt: new Date().toISOString(),
        filesRestored: 0,
        databaseRestored: false,
        configRestored: false,
        errors: ["Checkpoint does not support rollback"],
        warnings: [],
      };
    }

    if (options.dryRun) {
      return {
        success: true,
        checkpointId: options.checkpointId,
        restoredAt: new Date().toISOString(),
        filesRestored: 0,
        databaseRestored: false,
        configRestored: false,
        errors: [],
        warnings: ["Dry run - no changes made"],
      };
    }

    // Restore files from backup
    if (options.restoreFiles && checkpoint.rollback.filesBackup) {
      try {
        if (existsSync(checkpoint.rollback.filesBackup)) {
          await this.storage.restoreBackup(
            checkpoint.rollback.filesBackup,
            process.cwd()
          );
          filesRestored = 1; // We don't know exact count from tar
        } else {
          warnings.push("Backup file not found, attempting git restore");

          // Try git restore as fallback
          if (checkpoint.rollback.gitCommit) {
            try {
              execSync(`git checkout ${checkpoint.rollback.gitCommit} -- .`, {
                stdio: "pipe",
              });
              filesRestored = 1;
            } catch (gitError) {
              errors.push(`Git restore failed: ${gitError}`);
            }
          }
        }
      } catch (restoreError) {
        errors.push(`File restore failed: ${restoreError}`);
      }
    }

    // Restore database snapshot
    if (options.restoreDatabase && checkpoint.rollback.dbSnapshot) {
      try {
        // Database restore would be implemented here
        // For now, just mark as attempted
        warnings.push("Database restore not implemented");
        databaseRestored = false;
      } catch (dbError) {
        errors.push(`Database restore failed: ${dbError}`);
      }
    }

    // Restore config
    if (options.restoreConfig && checkpoint.rollback.configSnapshot) {
      try {
        await this.storage.saveConfig(checkpoint.rollback.configSnapshot);
        configRestored = true;
      } catch (configError) {
        errors.push(`Config restore failed: ${configError}`);
      }
    }

    return {
      success: errors.length === 0,
      checkpointId: options.checkpointId,
      restoredAt: new Date().toISOString(),
      filesRestored,
      databaseRestored,
      configRestored,
      errors,
      warnings,
    };
  }

  async diff(
    workflowId: string,
    fromCheckpointId: string,
    toCheckpointId: string
  ): Promise<CheckpointDiff | null> {
    const from = await this.get(workflowId, fromCheckpointId);
    const to = await this.get(workflowId, toCheckpointId);

    if (!from || !to) {
      return null;
    }

    return diffCheckpoints(from, to);
  }

  async createFromWorkflowState(
    workflowId: string,
    phase: string,
    taskId: string,
    completedTasks: string[],
    pendingTasks: string[],
    blockedTasks: string[],
    artifacts: Record<string, Artifact>,
    agents: AgentState[],
    resources: { costIncurred: number; timeElapsed: number; apiCalls: number }
  ): Promise<Checkpoint> {
    return this.create({
      workflowId,
      phase,
      taskId,
      state: {
        completedTasks,
        pendingTasks,
        blockedTasks,
        artifacts,
        taskStatuses: {},
        variables: {},
      },
      agents: {
        active: agents,
        terminated: [],
      },
      resources: {
        ...resources,
        tokensUsed: 0,
        filesChanged: 0,
      },
    });
  }

  setBackupPaths(paths: string[]): void {
    this.backupPaths = paths;
  }

  getBackupPaths(): string[] {
    return [...this.backupPaths];
  }

  setAutoBackup(enabled: boolean): void {
    this.autoBackup = enabled;
  }

  isAutoBackupEnabled(): boolean {
    return this.autoBackup;
  }
}

// Singleton instance
let defaultManager: CheckpointManager | null = null;

export function getCheckpointManager(
  config?: CheckpointManagerConfig
): CheckpointManager {
  if (!defaultManager) {
    defaultManager = new CheckpointManager(config);
  }
  return defaultManager;
}

export function resetCheckpointManager(): void {
  defaultManager = null;
}
