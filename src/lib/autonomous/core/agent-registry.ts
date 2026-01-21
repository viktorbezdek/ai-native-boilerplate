/**
 * Agent registry for managing agent lifecycle and state.
 * Tracks active agents, handles spawning and termination.
 */

import type { AgentState } from "../types/checkpoint";
import type { AgentType } from "../types/message";
import { type MessageBus, getMessageBus } from "./message-bus";

export type AgentStatus = "idle" | "busy" | "waiting" | "error" | "terminated";

export interface RegisteredAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  currentTaskId?: string;
  workflowId?: string;
  spawnedAt: string;
  lastActivity: string;
  messageCount: number;
  errorCount: number;
  metadata: Record<string, unknown>;
}

export interface SpawnAgentInput {
  type: AgentType;
  workflowId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRegistryConfig {
  messageBus?: MessageBus;
  maxAgentsPerType?: number;
  idleTimeout?: number;
}

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent>;
  private messageBus: MessageBus;
  private maxAgentsPerType: number;
  private idleTimeout: number;

  constructor(config: AgentRegistryConfig = {}) {
    this.agents = new Map();
    this.messageBus = config.messageBus ?? getMessageBus();
    this.maxAgentsPerType = config.maxAgentsPerType ?? 5;
    this.idleTimeout = config.idleTimeout ?? 300000; // 5 minutes
  }

  spawn(input: SpawnAgentInput): RegisteredAgent {
    // Check if we've hit the limit for this agent type
    const agentsOfType = this.getByType(input.type);
    if (agentsOfType.length >= this.maxAgentsPerType) {
      throw new Error(
        `Maximum agents of type ${input.type} reached (${this.maxAgentsPerType})`
      );
    }

    const agentId = this.generateAgentId(input.type);
    const now = new Date().toISOString();

    const agent: RegisteredAgent = {
      id: agentId,
      type: input.type,
      status: "idle",
      currentTaskId: input.taskId,
      workflowId: input.workflowId,
      spawnedAt: now,
      lastActivity: now,
      messageCount: 0,
      errorCount: 0,
      metadata: input.metadata ?? {},
    };

    this.agents.set(agentId, agent);

    // Subscribe to messages for this agent
    this.messageBus.subscribe(agentId, { to: [input.type] }, (message) => {
      const agentState = this.agents.get(agentId);
      if (agentState) {
        agentState.messageCount++;
        agentState.lastActivity = new Date().toISOString();
      }
    });

    return agent;
  }

  terminate(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = "terminated";
    this.messageBus.unsubscribeAll(agentId);
    this.agents.delete(agentId);

    return true;
  }

  terminateByType(type: AgentType): number {
    const agents = this.getByType(type);
    let count = 0;

    for (const agent of agents) {
      if (this.terminate(agent.id)) {
        count++;
      }
    }

    return count;
  }

  terminateAll(): number {
    const count = this.agents.size;
    for (const agentId of this.agents.keys()) {
      this.terminate(agentId);
    }
    return count;
  }

  get(agentId: string): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  getByType(type: AgentType): RegisteredAgent[] {
    return this.getAll().filter((a) => a.type === type);
  }

  getByStatus(status: AgentStatus): RegisteredAgent[] {
    return this.getAll().filter((a) => a.status === status);
  }

  getByWorkflow(workflowId: string): RegisteredAgent[] {
    return this.getAll().filter((a) => a.workflowId === workflowId);
  }

  getActive(): RegisteredAgent[] {
    return this.getAll().filter((a) => a.status !== "terminated");
  }

  getIdle(): RegisteredAgent[] {
    return this.getByStatus("idle");
  }

  getBusy(): RegisteredAgent[] {
    return this.getByStatus("busy");
  }

  updateStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.status = status;
    agent.lastActivity = new Date().toISOString();
    return true;
  }

  assignTask(agentId: string, taskId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.currentTaskId = taskId;
    agent.status = "busy";
    agent.lastActivity = new Date().toISOString();
    return true;
  }

  completeTask(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.currentTaskId = undefined;
    agent.status = "idle";
    agent.lastActivity = new Date().toISOString();
    return true;
  }

  recordError(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.errorCount++;
    agent.status = "error";
    agent.lastActivity = new Date().toISOString();
    return true;
  }

  clearError(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== "error") {
      return false;
    }

    agent.status = "idle";
    agent.lastActivity = new Date().toISOString();
    return true;
  }

  findAvailable(type: AgentType): RegisteredAgent | undefined {
    return this.getByType(type).find((a) => a.status === "idle");
  }

  findOrSpawn(type: AgentType, workflowId?: string): RegisteredAgent {
    const available = this.findAvailable(type);
    if (available) {
      if (workflowId) {
        available.workflowId = workflowId;
      }
      return available;
    }

    return this.spawn({ type, workflowId });
  }

  cleanupIdle(): number {
    const now = Date.now();
    let count = 0;

    for (const [agentId, agent] of this.agents) {
      if (agent.status === "idle") {
        const lastActivity = new Date(agent.lastActivity).getTime();
        if (now - lastActivity > this.idleTimeout) {
          this.terminate(agentId);
          count++;
        }
      }
    }

    return count;
  }

  toAgentStates(): AgentState[] {
    return this.getActive().map((agent) => ({
      id: agent.id,
      type: agent.type,
      status: agent.status as "idle" | "busy" | "waiting" | "error",
      currentTaskId: agent.currentTaskId,
      lastActivity: agent.lastActivity,
      messageCount: agent.messageCount,
      errorCount: agent.errorCount,
      metadata: agent.metadata,
    }));
  }

  getStats(): AgentRegistryStats {
    const agents = this.getAll();
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const agent of agents) {
      byType[agent.type] = (byType[agent.type] ?? 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] ?? 0) + 1;
    }

    return {
      total: agents.length,
      active: this.getActive().length,
      idle: this.getIdle().length,
      busy: this.getBusy().length,
      errors: this.getByStatus("error").length,
      byType,
      byStatus,
    };
  }

  private generateAgentId(type: AgentType): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export interface AgentRegistryStats {
  total: number;
  active: number;
  idle: number;
  busy: number;
  errors: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

// Singleton instance
let defaultRegistry: AgentRegistry | null = null;

export function getAgentRegistry(config?: AgentRegistryConfig): AgentRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new AgentRegistry(config);
  }
  return defaultRegistry;
}

export function resetAgentRegistry(): void {
  if (defaultRegistry) {
    defaultRegistry.terminateAll();
  }
  defaultRegistry = null;
}
