/**
 * Execution modes for the autonomous development system.
 * Controls what operations require user approval vs auto-approval.
 */

export type ExecutionMode =
  | "supervised"
  | "autonomous-low"
  | "autonomous-high"
  | "full-auto";

export interface ExecutionModeConfig {
  mode: ExecutionMode;
  budget?: {
    amount: number;
    currency: string;
  };
  timeout?: number; // milliseconds
  autoApprovalLevel: ApprovalLevel;
}

export type ApprovalLevel = "none" | "low" | "medium" | "high";

export interface ApprovalPolicy {
  planning: boolean;
  testing: boolean;
  nonProdDeployments: boolean;
  prodDeployments: boolean;
  destructiveOperations: boolean;
  infrastructureChanges: boolean;
  costThreshold: number;
}

export const APPROVAL_POLICIES: Record<ExecutionMode, ApprovalPolicy> = {
  supervised: {
    planning: false,
    testing: false,
    nonProdDeployments: false,
    prodDeployments: false,
    destructiveOperations: false,
    infrastructureChanges: false,
    costThreshold: 0,
  },
  "autonomous-low": {
    planning: true,
    testing: true,
    nonProdDeployments: true,
    prodDeployments: false,
    destructiveOperations: false,
    infrastructureChanges: false,
    costThreshold: 50,
  },
  "autonomous-high": {
    planning: true,
    testing: true,
    nonProdDeployments: true,
    prodDeployments: false,
    destructiveOperations: false,
    infrastructureChanges: false,
    costThreshold: 100,
  },
  "full-auto": {
    planning: true,
    testing: true,
    nonProdDeployments: true,
    prodDeployments: true,
    destructiveOperations: true,
    infrastructureChanges: true,
    costThreshold: Number.POSITIVE_INFINITY,
  },
};

export function getApprovalPolicy(mode: ExecutionMode): ApprovalPolicy {
  return APPROVAL_POLICIES[mode];
}

export function requiresApproval(
  mode: ExecutionMode,
  operation: keyof Omit<ApprovalPolicy, "costThreshold">,
  estimatedCost = 0
): boolean {
  const policy = getApprovalPolicy(mode);

  if (estimatedCost > policy.costThreshold) {
    return true;
  }

  return !policy[operation];
}

export const DEFAULT_EXECUTION_MODE: ExecutionMode = "supervised";

export const DEFAULT_MODE_CONFIG: ExecutionModeConfig = {
  mode: DEFAULT_EXECUTION_MODE,
  autoApprovalLevel: "none",
};
