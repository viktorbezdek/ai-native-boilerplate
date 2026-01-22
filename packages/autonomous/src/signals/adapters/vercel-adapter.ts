/**
 * Vercel Signal Adapter
 * Integrates with Vercel for deployment and performance signals
 */

import type { AdapterHealth, Signal, SignalAdapter } from "../../types/signal";

/**
 * Configuration for Vercel adapter
 */
export interface VercelAdapterConfig {
  token?: string;
  teamId?: string;
  projectId?: string;
  pollInterval: number;
}

/**
 * Default Vercel adapter config
 */
export const DEFAULT_VERCEL_ADAPTER_CONFIG: VercelAdapterConfig = {
  pollInterval: 60000,
};

/**
 * Vercel signal adapter for deployment monitoring
 */
export class VercelAdapter implements SignalAdapter {
  readonly source = "vercel" as const;
  private config: VercelAdapterConfig;
  private signalsReceived: number;
  private lastError: string | undefined;
  private lastPoll: Date | undefined;
  private lastDeploymentId: string | undefined;

  constructor(config: Partial<VercelAdapterConfig> = {}) {
    this.config = { ...DEFAULT_VERCEL_ADAPTER_CONFIG, ...config };
    this.signalsReceived = 0;
    this.lastError = undefined;
    this.lastPoll = undefined;
    this.lastDeploymentId = undefined;
  }

  /**
   * Poll for signals from Vercel
   */
  async poll(): Promise<Signal[]> {
    this.lastPoll = new Date();

    if (!this.config.token || !this.config.projectId) {
      return [];
    }

    const signals: Signal[] = [];

    try {
      // In real implementation, would call Vercel API
      // GET /v6/deployments?projectId={projectId}
      // GET /v1/web-vitals?projectId={projectId}

      // Simulated deployment events
      const mockDeployments: Array<{
        id: string;
        state: string;
        createdAt: number;
        error?: { message: string };
      }> = [];

      for (const deployment of mockDeployments) {
        // Skip already processed deployments
        if (deployment.id === this.lastDeploymentId) {
          continue;
        }

        if (deployment.state === "ERROR") {
          signals.push({
            id: `vercel_deploy_${deployment.id}`,
            type: "event",
            source: "vercel",
            priority: "critical",
            timestamp: new Date(deployment.createdAt),
            payload: {
              deploymentId: deployment.id,
              status: "failure",
              error: deployment.error?.message,
            },
            tags: ["vercel", "deployment", "failure"],
            processed: false,
          });
        } else if (deployment.state === "READY") {
          signals.push({
            id: `vercel_deploy_${deployment.id}`,
            type: "event",
            source: "vercel",
            priority: "low",
            timestamp: new Date(deployment.createdAt),
            payload: {
              deploymentId: deployment.id,
              status: "success",
            },
            tags: ["vercel", "deployment", "success"],
            processed: false,
          });
        }

        this.lastDeploymentId = deployment.id;
      }

      // Simulated web vitals signals
      const mockWebVitals: Array<{
        metric: string;
        value: number;
        rating: string;
      }> = [];

      for (const vital of mockWebVitals) {
        if (vital.rating === "poor") {
          signals.push({
            id: `vercel_vital_${vital.metric}_${Date.now()}`,
            type: "metric",
            source: "vercel",
            priority: "medium",
            timestamp: new Date(),
            payload: {
              metric: vital.metric,
              value: vital.value,
              rating: vital.rating,
              anomaly: true,
            },
            tags: ["vercel", "web-vitals", "poor"],
            processed: false,
          });
        }
      }

      this.signalsReceived += signals.length;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    return signals;
  }

  /**
   * Subscribe to Vercel webhooks
   */
  subscribe(_callback: (signal: Signal) => void): () => void {
    // In real implementation, would set up webhook listener
    // Vercel can send webhooks for deployment events
    return () => {
      // No-op unsubscribe
    };
  }

  /**
   * Test connection to Vercel
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.token) {
      return false;
    }

    try {
      // Would call Vercel API to verify
      // GET /v2/user
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get adapter health
   */
  async getHealth(): Promise<AdapterHealth> {
    const healthy = await this.testConnection();

    return {
      source: "vercel",
      healthy,
      lastPoll: this.lastPoll,
      lastError: this.lastError,
      signalsReceived: this.signalsReceived,
      errorRate: this.lastError ? 0.1 : 0,
    };
  }
}

// Factory function
export function createVercelAdapter(
  config?: Partial<VercelAdapterConfig>
): VercelAdapter {
  return new VercelAdapter(config);
}
