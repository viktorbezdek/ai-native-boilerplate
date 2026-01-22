/**
 * PostHog Signal Adapter
 * Integrates with PostHog for analytics and feature flag signals
 */

import type { AdapterHealth, Signal, SignalAdapter } from "../../types/signal";

/**
 * Configuration for PostHog adapter
 */
export interface PostHogAdapterConfig {
  apiKey?: string;
  host?: string;
  projectId?: string;
  pollInterval: number;
}

/**
 * Default PostHog adapter config
 */
export const DEFAULT_POSTHOG_ADAPTER_CONFIG: PostHogAdapterConfig = {
  host: "https://app.posthog.com",
  pollInterval: 300000, // 5 minutes
};

/**
 * PostHog signal adapter for analytics
 */
export class PostHogAdapter implements SignalAdapter {
  readonly source = "posthog" as const;
  private config: PostHogAdapterConfig;
  private signalsReceived: number;
  private lastError: string | undefined;
  private lastPoll: Date | undefined;

  constructor(config: Partial<PostHogAdapterConfig> = {}) {
    this.config = { ...DEFAULT_POSTHOG_ADAPTER_CONFIG, ...config };
    this.signalsReceived = 0;
    this.lastError = undefined;
    this.lastPoll = undefined;
  }

  /**
   * Poll for signals from PostHog
   */
  async poll(): Promise<Signal[]> {
    this.lastPoll = new Date();

    if (!this.config.apiKey || !this.config.projectId) {
      return [];
    }

    const signals: Signal[] = [];

    try {
      // In real implementation, would call PostHog API
      // - Feature flag evaluations
      // - Experiment results
      // - Funnel analysis
      // - Session recordings with errors

      // Example API calls:
      // GET /api/projects/{project_id}/feature_flags
      // GET /api/projects/{project_id}/experiments

      // Simulated feature flag anomaly detection
      const mockFlags: Array<{
        key: string;
        enabled: boolean;
        rolloutPercentage: number;
        anomalyDetected: boolean;
      }> = [];

      for (const flag of mockFlags) {
        if (flag.anomalyDetected) {
          signals.push({
            id: `posthog_flag_${flag.key}_${Date.now()}`,
            type: "metric",
            source: "posthog",
            priority: "medium",
            timestamp: new Date(),
            payload: {
              metric: `feature_flag.${flag.key}`,
              value: flag.rolloutPercentage,
              anomaly: true,
              enabled: flag.enabled,
            },
            tags: ["posthog", "feature-flag", "anomaly"],
            processed: false,
          });
        }
      }

      // Simulated experiment signals
      const mockExperiments: Array<{
        id: string;
        name: string;
        status: string;
        significance: number;
      }> = [];

      for (const exp of mockExperiments) {
        if (exp.significance >= 0.95) {
          signals.push({
            id: `posthog_exp_${exp.id}_${Date.now()}`,
            type: "event",
            source: "posthog",
            priority: "medium",
            timestamp: new Date(),
            payload: {
              experimentId: exp.id,
              name: exp.name,
              status: exp.status,
              significance: exp.significance,
            },
            tags: ["posthog", "experiment", "significant"],
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
   * Test connection to PostHog
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Would call PostHog API to verify
      // GET /api/projects/{project_id}
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
      source: "posthog",
      healthy,
      lastPoll: this.lastPoll,
      lastError: this.lastError,
      signalsReceived: this.signalsReceived,
      errorRate: this.lastError ? 0.1 : 0,
    };
  }
}

// Factory function
export function createPostHogAdapter(
  config?: Partial<PostHogAdapterConfig>
): PostHogAdapter {
  return new PostHogAdapter(config);
}
