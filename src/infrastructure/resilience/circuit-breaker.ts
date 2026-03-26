export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  public constructor(
    private readonly failureThreshold = 3,
    private readonly openDurationMs = 10_000,
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.openUntil > now) {
      throw new Error('Circuit breaker is open.');
    }

    try {
      const result = await operation();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.openUntil = Date.now() + this.openDurationMs;
      }
      throw error;
    }
  }
}
