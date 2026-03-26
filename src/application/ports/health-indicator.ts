export interface HealthIndicatorResult {
  name: string;
  status: 'up' | 'down' | 'degraded';
  details?: Record<string, unknown>;
}

export interface HealthIndicator {
  check(): Promise<HealthIndicatorResult>;
}
