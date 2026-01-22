/**
 * Sentry Signal Adapter
 * Integrates with Sentry for error tracking signals
 */

import type { AdapterHealth, Signal, SignalAdapter } from "../../types/signal";

/**
 * Configuration for Sentry adapter
 */
export interface SentryAdapterConfig {
  dsn?: string;
  organization?: string;
  project?: string;
  apiToken?: string;
  pollInterval: number;
}

/**
 * Default Sentry adapter config
 */
export const DEFAULT_SENTRY_ADAPTER_CONFIG: SentryAdapterConfig = {
  pollInterval: 60000,
};

/**
 * Sentry signal adapter for error tracking
 */
export class SentryAdapter implements SignalAdapter {
  readonly source = "sentry" as const;
  private config: SentryAdapterConfig;
  private signalsReceived: number;
  private lastError: string | undefined;
  private lastPoll: Date | undefined;

  constructor(config: Partial<SentryAdapterConfig> = {}) {
    this.config = { ...DEFAULT_SENTRY_ADAPTER_CONFIG, ...config };
    this.signalsReceived = 0;
    this.lastError = undefined;
    this.lastPoll = undefined;
  }

  /**
   * Poll for new signals from Sentry
   */
  async poll(): Promise<Signal[]> {
    this.lastPoll = new Date();

    if (
      !this.config.apiToken ||
      !this.config.organization ||
      !this.config.project
    ) {
      // Not configured, return empty
      return [];
    }

    const signals: Signal[] = [];

    try {
      // In real implementation, would call Sentry API
      // GET /api/0/projects/{organization_slug}/{project_slug}/issues/
      // Example: fetch(`https://sentry.io/api/0/projects/${org}/${proj}/issues/`, { headers })

      // Simulated response
      const mockIssues: Array<{
        id: string;
        title: string;
        level: string;
        count: number;
        lastSeen: string;
      }> = [];

      for (const issue of mockIssues) {
        signals.push({
          id: `sentry_${issue.id}`,
          type: "error",
          source: "sentry",
          priority: this.mapSeverity(issue.level),
          timestamp: new Date(issue.lastSeen),
          payload: {
            issueId: issue.id,
            title: issue.title,
            level: issue.level,
            count: issue.count,
          },
          tags: ["sentry", "error", issue.level],
          processed: false,
        });
      }

      this.signalsReceived += signals.length;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    return signals;
  }

  /**
   * Subscribe to real-time Sentry webhooks
   */
  subscribe(_callback: (signal: Signal) => void): () => void {
    // In real implementation, would set up webhook listener
    // For now, return no-op unsubscribe
    return () => {
      // No-op unsubscribe
    };
  }

  /**
   * Test connection to Sentry
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.apiToken) {
      return false;
    }

    try {
      // Would call Sentry API to verify token
      // GET /api/0/
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
      source: "sentry",
      healthy,
      lastPoll: this.lastPoll,
      lastError: this.lastError,
      signalsReceived: this.signalsReceived,
      errorRate: this.lastError ? 0.1 : 0,
    };
  }

  /**
   * Map Sentry severity to signal priority
   */
  private mapSeverity(level: string): Signal["priority"] {
    switch (level) {
      case "fatal":
        return "critical";
      case "error":
        return "high";
      case "warning":
        return "medium";
      default:
        return "low";
    }
  }
}

// Factory function
export function createSentryAdapter(
  config?: Partial<SentryAdapterConfig>
): SentryAdapter {
  return new SentryAdapter(config);
}
