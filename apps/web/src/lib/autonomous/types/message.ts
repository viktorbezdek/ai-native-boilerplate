/**
 * Inter-agent communication protocol for the autonomous development system.
 * Based on the message format from the project specification.
 */

import type { TaskStatus } from "./workflow";

export type MessageType = "request" | "response" | "checkpoint" | "escalation";

export type AgentType =
  | "planner"
  | "developer"
  | "tester"
  | "reviewer"
  | "deployer"
  | "observer"
  | "responder"
  | "coordinator";

export type MessageRecipient = AgentType | "coordinator" | "user";

export interface Artifact {
  id: string;
  type: ArtifactType;
  path: string;
  description: string;
  createdAt: string;
  size?: number;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export type ArtifactType =
  | "file"
  | "directory"
  | "log"
  | "report"
  | "test_result"
  | "coverage_report"
  | "diff"
  | "snapshot"
  | "backup";

export interface MessagePayload {
  taskId: string;
  status: TaskStatus;
  artifacts: Artifact[];
  requiresApproval: boolean;
  context: Record<string, unknown>;
  error?: MessageError;
  result?: unknown;
}

export interface MessageError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface AgentMessage {
  id: string;
  from: AgentType;
  to: MessageRecipient;
  type: MessageType;
  timestamp: string;
  payload: MessagePayload;
  correlationId?: string; // For request-response matching
  parentMessageId?: string; // For conversation threading
  priority: MessagePriority;
  ttl?: number; // Time-to-live in milliseconds
  acknowledged: boolean;
}

export type MessagePriority = "critical" | "high" | "normal" | "low";

export interface MessageFilter {
  from?: AgentType[];
  to?: MessageRecipient[];
  type?: MessageType[];
  taskId?: string;
  correlationId?: string;
  since?: string;
  until?: string;
  priority?: MessagePriority[];
  acknowledged?: boolean;
}

export interface MessageSubscription {
  id: string;
  agentId: string;
  filter: MessageFilter;
  callback: (message: AgentMessage) => void | Promise<void>;
  createdAt: string;
  active: boolean;
}

export interface EscalationRequest {
  messageId: string;
  reason: EscalationReason;
  description: string;
  suggestedActions: string[];
  blockedTaskIds: string[];
  deadline?: string;
}

export type EscalationReason =
  | "requires_human_input"
  | "budget_exceeded"
  | "timeout_exceeded"
  | "repeated_failures"
  | "security_concern"
  | "unclear_requirements"
  | "conflicting_constraints"
  | "external_dependency";

export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createArtifactId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createMessage(
  from: AgentType,
  to: MessageRecipient,
  type: MessageType,
  payload: Partial<MessagePayload>,
  options: Partial<
    Pick<AgentMessage, "correlationId" | "parentMessageId" | "priority" | "ttl">
  > = {}
): AgentMessage {
  return {
    id: createMessageId(),
    from,
    to,
    type,
    timestamp: new Date().toISOString(),
    payload: {
      taskId: payload.taskId ?? "",
      status: payload.status ?? "pending",
      artifacts: payload.artifacts ?? [],
      requiresApproval: payload.requiresApproval ?? false,
      context: payload.context ?? {},
      error: payload.error,
      result: payload.result,
    },
    correlationId: options.correlationId,
    parentMessageId: options.parentMessageId,
    priority: options.priority ?? "normal",
    ttl: options.ttl,
    acknowledged: false,
  };
}

export function createRequestMessage(
  from: AgentType,
  to: MessageRecipient,
  taskId: string,
  context: Record<string, unknown>
): AgentMessage {
  return createMessage(from, to, "request", {
    taskId,
    status: "pending",
    context,
    requiresApproval: false,
  });
}

export function createResponseMessage(
  request: AgentMessage,
  from: AgentType,
  status: TaskStatus,
  result?: unknown,
  artifacts: Artifact[] = []
): AgentMessage {
  return createMessage(
    from,
    request.from,
    "response",
    {
      taskId: request.payload.taskId,
      status,
      artifacts,
      context: request.payload.context,
      result,
    },
    { correlationId: request.id }
  );
}

export function createEscalationMessage(
  from: AgentType,
  reason: EscalationReason,
  description: string,
  taskId: string,
  suggestedActions: string[] = []
): AgentMessage {
  return createMessage(
    from,
    "user",
    "escalation",
    {
      taskId,
      status: "blocked",
      requiresApproval: true,
      context: {
        escalationReason: reason,
        description,
        suggestedActions,
      },
    },
    { priority: "high" }
  );
}

export function createCheckpointMessage(
  from: AgentType,
  taskId: string,
  checkpointId: string,
  artifacts: Artifact[]
): AgentMessage {
  return createMessage(from, "coordinator", "checkpoint", {
    taskId,
    status: "completed",
    artifacts,
    context: { checkpointId },
  });
}

export function matchesFilter(
  message: AgentMessage,
  filter: MessageFilter
): boolean {
  if (filter.from && !filter.from.includes(message.from)) {
    return false;
  }
  if (filter.to && !filter.to.includes(message.to as AgentType)) {
    return false;
  }
  if (filter.type && !filter.type.includes(message.type)) {
    return false;
  }
  if (filter.taskId && message.payload.taskId !== filter.taskId) {
    return false;
  }
  if (filter.correlationId && message.correlationId !== filter.correlationId) {
    return false;
  }
  if (filter.priority && !filter.priority.includes(message.priority)) {
    return false;
  }
  if (
    filter.acknowledged !== undefined &&
    message.acknowledged !== filter.acknowledged
  ) {
    return false;
  }

  if (filter.since) {
    const sinceDate = new Date(filter.since);
    const messageDate = new Date(message.timestamp);
    if (messageDate < sinceDate) {
      return false;
    }
  }

  if (filter.until) {
    const untilDate = new Date(filter.until);
    const messageDate = new Date(message.timestamp);
    if (messageDate > untilDate) {
      return false;
    }
  }

  return true;
}
