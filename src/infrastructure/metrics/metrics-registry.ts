import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export class MetricsRegistry {
  public readonly registry = new Registry();
  public readonly documentsGeneratedTotal: Counter<string>;
  public readonly batchProcessingDurationSeconds: Histogram<string>;
  public readonly queueSize: Gauge<string>;

  public constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.documentsGeneratedTotal = new Counter({
      name: 'documents_generated_total',
      help: 'Total number of generated documents',
      labelNames: ['document_type', 'status'],
      registers: [this.registry],
    });

    this.batchProcessingDurationSeconds = new Histogram({
      name: 'batch_processing_duration_seconds',
      help: 'Batch processing duration in seconds',
      buckets: [1, 5, 15, 30, 60, 120, 300],
      labelNames: ['document_type', 'status'],
      registers: [this.registry],
    });

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Current queue size',
      registers: [this.registry],
    });
  }
}
