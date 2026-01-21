/**
 * File-based persistence for the autonomous development system.
 * Stores workflows, checkpoints, and logs at ~/.autonomous/
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Checkpoint, CheckpointSummary } from "../types/checkpoint";
import type { AgentMessage } from "../types/message";
import type {
  Workflow,
  WorkflowEvent,
  WorkflowSummary,
} from "../types/workflow";

const AUTONOMOUS_DIR = join(homedir(), ".autonomous");
const WORKFLOWS_DIR = join(AUTONOMOUS_DIR, "workflows");
const AGENTS_DIR = join(AUTONOMOUS_DIR, "agents");
const CONFIG_FILE = join(AUTONOMOUS_DIR, "config.yaml");

export interface StorageConfig {
  baseDir?: string;
  maxCheckpoints?: number;
  maxLogs?: number;
  compressionEnabled?: boolean;
}

export class FileStorage {
  private baseDir: string;
  private maxCheckpoints: number;
  private maxLogs: number;

  constructor(config: StorageConfig = {}) {
    this.baseDir = config.baseDir ?? AUTONOMOUS_DIR;
    this.maxCheckpoints = config.maxCheckpoints ?? 100;
    this.maxLogs = config.maxLogs ?? 1000;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.baseDir,
      join(this.baseDir, "workflows"),
      join(this.baseDir, "agents"),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  private getWorkflowDir(workflowId: string): string {
    return join(this.baseDir, "workflows", workflowId);
  }

  private ensureWorkflowDir(workflowId: string): string {
    const dir = this.getWorkflowDir(workflowId);
    const subdirs = ["checkpoints", "logs", "artifacts"];

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    for (const subdir of subdirs) {
      const path = join(dir, subdir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    }

    return dir;
  }

  // Workflow Operations

  async saveWorkflow(workflow: Workflow): Promise<void> {
    const dir = this.ensureWorkflowDir(workflow.id);
    const planPath = join(dir, "plan.json");
    const statePath = join(dir, "state.json");

    await writeFile(planPath, JSON.stringify(workflow.plan, null, 2));
    await writeFile(statePath, JSON.stringify(workflow, null, 2));
  }

  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    const statePath = join(this.getWorkflowDir(workflowId), "state.json");

    if (!existsSync(statePath)) {
      return null;
    }

    const content = await readFile(statePath, "utf-8");
    return JSON.parse(content) as Workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const dir = this.getWorkflowDir(workflowId);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true });
    }
  }

  async listWorkflows(): Promise<WorkflowSummary[]> {
    const workflowsDir = join(this.baseDir, "workflows");
    if (!existsSync(workflowsDir)) {
      return [];
    }

    const entries = readdirSync(workflowsDir);
    const summaries: WorkflowSummary[] = [];

    for (const entry of entries) {
      const workflow = await this.loadWorkflow(entry);
      if (workflow) {
        const completedTasks = workflow.plan.tasks.filter(
          (t) => t.status === "completed"
        ).length;

        summaries.push({
          id: workflow.id,
          title: workflow.plan.title,
          status: workflow.status,
          progress: Math.round(
            (completedTasks / workflow.plan.tasks.length) * 100
          ),
          currentPhase: workflow.currentPhase,
          tasksCompleted: completedTasks,
          tasksTotal: workflow.plan.tasks.length,
          startedAt: workflow.startedAt,
        });
      }
    }

    return summaries.sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  // Checkpoint Operations

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const dir = this.ensureWorkflowDir(checkpoint.workflowId);
    const checkpointPath = join(dir, "checkpoints", `${checkpoint.id}.json`);

    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));

    // Cleanup old checkpoints if exceeding limit
    await this.cleanupOldCheckpoints(checkpoint.workflowId);
  }

  async loadCheckpoint(
    workflowId: string,
    checkpointId: string
  ): Promise<Checkpoint | null> {
    const checkpointPath = join(
      this.getWorkflowDir(workflowId),
      "checkpoints",
      `${checkpointId}.json`
    );

    if (!existsSync(checkpointPath)) {
      return null;
    }

    const content = await readFile(checkpointPath, "utf-8");
    return JSON.parse(content) as Checkpoint;
  }

  async listCheckpoints(workflowId: string): Promise<CheckpointSummary[]> {
    const checkpointsDir = join(this.getWorkflowDir(workflowId), "checkpoints");

    if (!existsSync(checkpointsDir)) {
      return [];
    }

    const files = readdirSync(checkpointsDir).filter((f) =>
      f.endsWith(".json")
    );
    const summaries: CheckpointSummary[] = [];

    for (const file of files) {
      const checkpointId = file.replace(".json", "");
      const checkpoint = await this.loadCheckpoint(workflowId, checkpointId);
      if (checkpoint) {
        summaries.push({
          id: checkpoint.id,
          workflowId: checkpoint.workflowId,
          timestamp: checkpoint.timestamp,
          phase: checkpoint.phase,
          taskId: checkpoint.taskId,
          completedTaskCount: checkpoint.state.completedTasks.length,
          pendingTaskCount: checkpoint.state.pendingTasks.length,
          costIncurred: checkpoint.resources.costIncurred,
          canRollback: checkpoint.rollback.canRollback,
        });
      }
    }

    return summaries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getLatestCheckpoint(workflowId: string): Promise<Checkpoint | null> {
    const summaries = await this.listCheckpoints(workflowId);
    if (summaries.length === 0) {
      return null;
    }
    return this.loadCheckpoint(workflowId, summaries[0].id);
  }

  private async cleanupOldCheckpoints(workflowId: string): Promise<void> {
    const summaries = await this.listCheckpoints(workflowId);
    if (summaries.length <= this.maxCheckpoints) {
      return;
    }

    const toDelete = summaries.slice(this.maxCheckpoints);
    for (const summary of toDelete) {
      const path = join(
        this.getWorkflowDir(workflowId),
        "checkpoints",
        `${summary.id}.json`
      );
      await unlink(path);
    }
  }

  // Log Operations

  async appendLog(
    workflowId: string,
    taskId: string,
    message: string
  ): Promise<void> {
    const dir = this.ensureWorkflowDir(workflowId);
    const logPath = join(dir, "logs", `${taskId}.log`);

    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    const existingContent = existsSync(logPath)
      ? await readFile(logPath, "utf-8")
      : "";

    await writeFile(logPath, existingContent + logLine);
  }

  async readLogs(
    workflowId: string,
    taskId: string,
    tail?: number
  ): Promise<string[]> {
    const logPath = join(
      this.getWorkflowDir(workflowId),
      "logs",
      `${taskId}.log`
    );

    if (!existsSync(logPath)) {
      return [];
    }

    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    if (tail && tail > 0) {
      return lines.slice(-tail);
    }

    return lines;
  }

  // Event Operations

  async saveEvent(event: WorkflowEvent): Promise<void> {
    const dir = this.ensureWorkflowDir(event.workflowId);
    const eventsPath = join(dir, "events.jsonl");

    const existingContent = existsSync(eventsPath)
      ? await readFile(eventsPath, "utf-8")
      : "";

    await writeFile(eventsPath, existingContent + JSON.stringify(event) + "\n");
  }

  async loadEvents(workflowId: string): Promise<WorkflowEvent[]> {
    const eventsPath = join(this.getWorkflowDir(workflowId), "events.jsonl");

    if (!existsSync(eventsPath)) {
      return [];
    }

    const content = await readFile(eventsPath, "utf-8");
    return content
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as WorkflowEvent);
  }

  // Artifact Operations

  async saveArtifact(
    workflowId: string,
    artifactId: string,
    content: string | Buffer
  ): Promise<string> {
    const dir = this.ensureWorkflowDir(workflowId);
    const artifactPath = join(dir, "artifacts", artifactId);

    await writeFile(artifactPath, content);
    return artifactPath;
  }

  async loadArtifact(
    workflowId: string,
    artifactId: string
  ): Promise<Buffer | null> {
    const artifactPath = join(
      this.getWorkflowDir(workflowId),
      "artifacts",
      artifactId
    );

    if (!existsSync(artifactPath)) {
      return null;
    }

    return readFile(artifactPath);
  }

  async listArtifacts(workflowId: string): Promise<string[]> {
    const artifactsDir = join(this.getWorkflowDir(workflowId), "artifacts");

    if (!existsSync(artifactsDir)) {
      return [];
    }

    return readdirSync(artifactsDir);
  }

  // Backup Operations

  async createBackup(
    workflowId: string,
    checkpointId: string,
    sourcePaths: string[]
  ): Promise<string> {
    const dir = this.ensureWorkflowDir(workflowId);
    const backupPath = join(
      dir,
      "checkpoints",
      `${checkpointId}_backup.tar.gz`
    );

    // Filter to only existing paths
    const existingPaths = sourcePaths.filter((p) => existsSync(p));

    if (existingPaths.length === 0) {
      // Create empty backup file
      await writeFile(backupPath, "");
      return backupPath;
    }

    try {
      // Create tar.gz backup
      const pathsArg = existingPaths.map((p) => `"${p}"`).join(" ");
      execSync(`tar -czf "${backupPath}" ${pathsArg}`, { stdio: "pipe" });
    } catch {
      // If tar fails, create empty file
      await writeFile(backupPath, "");
    }

    return backupPath;
  }

  async restoreBackup(backupPath: string, targetDir: string): Promise<void> {
    if (!existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    const stats = statSync(backupPath);
    if (stats.size === 0) {
      // Empty backup, nothing to restore
      return;
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    execSync(`tar -xzf "${backupPath}" -C "${targetDir}"`, { stdio: "pipe" });
  }

  // Message Operations (for debugging/logging)

  async saveMessage(workflowId: string, message: AgentMessage): Promise<void> {
    const dir = this.ensureWorkflowDir(workflowId);
    const messagesPath = join(dir, "messages.jsonl");

    const existingContent = existsSync(messagesPath)
      ? await readFile(messagesPath, "utf-8")
      : "";

    await writeFile(
      messagesPath,
      existingContent + JSON.stringify(message) + "\n"
    );
  }

  async loadMessages(workflowId: string): Promise<AgentMessage[]> {
    const messagesPath = join(
      this.getWorkflowDir(workflowId),
      "messages.jsonl"
    );

    if (!existsSync(messagesPath)) {
      return [];
    }

    const content = await readFile(messagesPath, "utf-8");
    return content
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as AgentMessage);
  }

  // Config Operations

  async saveConfig(config: Record<string, unknown>): Promise<void> {
    const configPath = join(this.baseDir, "config.json");
    await writeFile(configPath, JSON.stringify(config, null, 2));
  }

  async loadConfig(): Promise<Record<string, unknown>> {
    const configPath = join(this.baseDir, "config.json");

    if (!existsSync(configPath)) {
      return {};
    }

    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  }

  // Utility Methods

  getBaseDir(): string {
    return this.baseDir;
  }

  workflowExists(workflowId: string): boolean {
    return existsSync(join(this.getWorkflowDir(workflowId), "state.json"));
  }

  checkpointExists(workflowId: string, checkpointId: string): boolean {
    return existsSync(
      join(
        this.getWorkflowDir(workflowId),
        "checkpoints",
        `${checkpointId}.json`
      )
    );
  }
}

// Singleton instance for convenience
let defaultStorage: FileStorage | null = null;

export function getStorage(config?: StorageConfig): FileStorage {
  if (!defaultStorage) {
    defaultStorage = new FileStorage(config);
  }
  return defaultStorage;
}

export function resetStorage(): void {
  defaultStorage = null;
}
