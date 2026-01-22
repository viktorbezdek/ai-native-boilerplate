import { describe, expect, it } from "vitest";
import {
  APPROVAL_POLICIES,
  type ApprovalPolicy,
  type ExecutionMode,
  getApprovalPolicy,
  requiresApproval,
} from "@/lib/autonomous/types/execution-mode";

describe("ExecutionMode", () => {
  describe("getApprovalPolicy", () => {
    it("returns correct policy for supervised mode", () => {
      const policy = getApprovalPolicy("supervised");

      expect(policy.planning).toBe(false);
      expect(policy.testing).toBe(false);
      expect(policy.prodDeployments).toBe(false);
      expect(policy.costThreshold).toBe(0);
    });

    it("returns correct policy for autonomous-low mode", () => {
      const policy = getApprovalPolicy("autonomous-low");

      expect(policy.planning).toBe(true);
      expect(policy.testing).toBe(true);
      expect(policy.nonProdDeployments).toBe(true);
      expect(policy.prodDeployments).toBe(false);
      expect(policy.destructiveOperations).toBe(false);
      expect(policy.costThreshold).toBe(50);
    });

    it("returns correct policy for autonomous-high mode", () => {
      const policy = getApprovalPolicy("autonomous-high");

      expect(policy.planning).toBe(true);
      expect(policy.testing).toBe(true);
      expect(policy.nonProdDeployments).toBe(true);
      expect(policy.prodDeployments).toBe(false);
      expect(policy.destructiveOperations).toBe(false);
      expect(policy.costThreshold).toBe(100);
    });

    it("returns correct policy for full-auto mode", () => {
      const policy = getApprovalPolicy("full-auto");

      expect(policy.planning).toBe(true);
      expect(policy.testing).toBe(true);
      expect(policy.prodDeployments).toBe(true);
      expect(policy.destructiveOperations).toBe(true);
      expect(policy.infrastructureChanges).toBe(true);
      expect(policy.costThreshold).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe("requiresApproval", () => {
    it("requires approval for all actions in supervised mode", () => {
      expect(requiresApproval("supervised", "planning")).toBe(true);
      expect(requiresApproval("supervised", "testing")).toBe(true);
      expect(requiresApproval("supervised", "prodDeployments")).toBe(true);
    });

    it("auto-approves planning in autonomous-low mode", () => {
      expect(requiresApproval("autonomous-low", "planning")).toBe(false);
      expect(requiresApproval("autonomous-low", "testing")).toBe(false);
      expect(requiresApproval("autonomous-low", "nonProdDeployments")).toBe(
        false
      );
    });

    it("requires approval for prod in autonomous-low mode", () => {
      expect(requiresApproval("autonomous-low", "prodDeployments")).toBe(true);
      expect(requiresApproval("autonomous-low", "destructiveOperations")).toBe(
        true
      );
    });

    it("auto-approves non-prod deployments in autonomous-high mode", () => {
      expect(requiresApproval("autonomous-high", "nonProdDeployments")).toBe(
        false
      );
      expect(requiresApproval("autonomous-high", "planning")).toBe(false);
    });

    it("requires approval for production in autonomous-high mode", () => {
      expect(requiresApproval("autonomous-high", "prodDeployments")).toBe(true);
      expect(requiresApproval("autonomous-high", "infrastructureChanges")).toBe(
        true
      );
    });

    it("auto-approves most actions in full-auto mode", () => {
      expect(requiresApproval("full-auto", "planning")).toBe(false);
      expect(requiresApproval("full-auto", "testing")).toBe(false);
      expect(requiresApproval("full-auto", "prodDeployments")).toBe(false);
      expect(requiresApproval("full-auto", "destructiveOperations")).toBe(
        false
      );
    });

    it("requires approval when cost exceeds threshold", () => {
      // Autonomous-low has $50 threshold
      expect(requiresApproval("autonomous-low", "planning", 60)).toBe(true);

      // Autonomous-high has $100 threshold
      expect(requiresApproval("autonomous-high", "planning", 110)).toBe(true);

      // Full-auto has infinite threshold
      expect(requiresApproval("full-auto", "planning", 1000000)).toBe(false);
    });
  });

  describe("budget thresholds", () => {
    it("has correct budget threshold for autonomous-low", () => {
      const policy = getApprovalPolicy("autonomous-low");
      expect(policy.costThreshold).toBe(50);
    });

    it("has correct budget threshold for autonomous-high", () => {
      const policy = getApprovalPolicy("autonomous-high");
      expect(policy.costThreshold).toBe(100);
    });

    it("has infinite budget threshold for full-auto", () => {
      const policy = getApprovalPolicy("full-auto");
      expect(policy.costThreshold).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
