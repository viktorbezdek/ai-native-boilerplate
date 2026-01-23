/**
 * Message bus for inter-agent communication.
 * Provides publish-subscribe messaging with filtering capabilities.
 */

import { type FileStorage, getStorage } from "../persistence/file-storage";
import type {
  AgentMessage,
  AgentType,
  MessageFilter,
  MessageRecipient,
  MessageSubscription,
} from "../types/message";
import { createMessageId, matchesFilter } from "../types/message";

export interface MessageBusConfig {
  storage?: FileStorage;
  workflowId?: string;
  maxQueueSize?: number;
  enablePersistence?: boolean;
}

type MessageCallback = (message: AgentMessage) => void | Promise<void>;

export class MessageBus {
  private storage: FileStorage;
  private workflowId: string | null;
  private subscriptions: Map<string, MessageSubscription>;
  private messageQueue: AgentMessage[];
  private maxQueueSize: number;
  private enablePersistence: boolean;

  constructor(config: MessageBusConfig = {}) {
    this.storage = config.storage ?? getStorage();
    this.workflowId = config.workflowId ?? null;
    this.maxQueueSize = config.maxQueueSize ?? 10000;
    this.enablePersistence = config.enablePersistence ?? true;
    this.subscriptions = new Map();
    this.messageQueue = [];
  }

  setWorkflowId(workflowId: string): void {
    this.workflowId = workflowId;
  }

  subscribe(
    agentId: string,
    filter: MessageFilter,
    callback: MessageCallback
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const subscription: MessageSubscription = {
      id: subscriptionId,
      agentId,
      filter,
      callback,
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  unsubscribeAll(agentId: string): number {
    let count = 0;
    for (const [id, sub] of this.subscriptions) {
      if (sub.agentId === agentId) {
        this.subscriptions.delete(id);
        count++;
      }
    }
    return count;
  }

  async publish(message: AgentMessage): Promise<void> {
    // Add to queue
    this.messageQueue.push(message);

    // Trim queue if exceeding max size
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue = this.messageQueue.slice(-this.maxQueueSize);
    }

    // Persist message if enabled
    if (this.enablePersistence && this.workflowId) {
      await this.storage.saveMessage(this.workflowId, message);
    }

    // Process message
    await this.processMessage(message);
  }

  private async processMessage(message: AgentMessage): Promise<void> {
    const matchingSubscriptions = Array.from(
      this.subscriptions.values()
    ).filter((sub) => sub.active && matchesFilter(message, sub.filter));

    for (const subscription of matchingSubscriptions) {
      try {
        await subscription.callback(message);
      } catch (error) {
        console.error(
          `Error in subscription ${subscription.id} for agent ${subscription.agentId}:`,
          error
        );
      }
    }
  }

  async request(
    from: AgentType,
    to: MessageRecipient,
    taskId: string,
    context: Record<string, unknown>,
    timeout = 30000
  ): Promise<AgentMessage | null> {
    const requestId = createMessageId();

    const requestMessage: AgentMessage = {
      id: requestId,
      from,
      to,
      type: "request",
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        status: "pending",
        artifacts: [],
        requiresApproval: false,
        context,
      },
      priority: "normal",
      acknowledged: false,
    };

    return new Promise((resolve) => {
      let resolved = false;
      let subscriptionId: string | null = null;

      // Set up response listener
      subscriptionId = this.subscribe(
        from,
        { correlationId: requestId, type: ["response"] },
        (response) => {
          if (!resolved) {
            resolved = true;
            if (subscriptionId) {
              this.unsubscribe(subscriptionId);
            }
            resolve(response);
          }
        }
      );

      // Set timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (subscriptionId) {
            this.unsubscribe(subscriptionId);
          }
          resolve(null);
        }
      }, timeout);

      // Publish request
      this.publish(requestMessage);
    });
  }

  acknowledge(messageId: string): boolean {
    const message = this.messageQueue.find((m) => m.id === messageId);
    if (message) {
      message.acknowledged = true;
      return true;
    }
    return false;
  }

  getMessages(filter?: MessageFilter): AgentMessage[] {
    if (!filter) {
      return [...this.messageQueue];
    }
    return this.messageQueue.filter((m) => matchesFilter(m, filter));
  }

  getUnacknowledged(): AgentMessage[] {
    return this.messageQueue.filter((m) => !m.acknowledged);
  }

  getPendingRequests(agentId?: AgentType): AgentMessage[] {
    return this.messageQueue.filter((m) => {
      if (m.type !== "request") {
        return false;
      }
      if (m.acknowledged) {
        return false;
      }
      if (agentId && m.to !== agentId) {
        return false;
      }
      return true;
    });
  }

  getEscalations(): AgentMessage[] {
    return this.messageQueue.filter((m) => m.type === "escalation");
  }

  getMessagesByTask(taskId: string): AgentMessage[] {
    return this.messageQueue.filter((m) => m.payload.taskId === taskId);
  }

  getMessageHistory(
    from?: AgentType,
    to?: MessageRecipient,
    limit = 100
  ): AgentMessage[] {
    let messages = this.messageQueue;

    if (from) {
      messages = messages.filter((m) => m.from === from);
    }

    if (to) {
      messages = messages.filter((m) => m.to === to);
    }

    return messages.slice(-limit);
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  async loadHistory(): Promise<AgentMessage[]> {
    if (!this.workflowId) {
      return [];
    }
    return this.storage.loadMessages(this.workflowId);
  }

  getStats(): MessageBusStats {
    const byType: Record<string, number> = {};
    const byFrom: Record<string, number> = {};
    const byTo: Record<string, number> = {};

    for (const message of this.messageQueue) {
      byType[message.type] = (byType[message.type] ?? 0) + 1;
      byFrom[message.from] = (byFrom[message.from] ?? 0) + 1;
      byTo[message.to] = (byTo[message.to] ?? 0) + 1;
    }

    return {
      totalMessages: this.messageQueue.length,
      unacknowledged: this.getUnacknowledged().length,
      subscriptions: this.subscriptions.size,
      byType,
      byFrom,
      byTo,
    };
  }
}

export interface MessageBusStats {
  totalMessages: number;
  unacknowledged: number;
  subscriptions: number;
  byType: Record<string, number>;
  byFrom: Record<string, number>;
  byTo: Record<string, number>;
}

// Singleton instance
let defaultBus: MessageBus | null = null;

export function getMessageBus(config?: MessageBusConfig): MessageBus {
  if (!defaultBus) {
    defaultBus = new MessageBus(config);
  }
  return defaultBus;
}

export function resetMessageBus(): void {
  defaultBus = null;
}
