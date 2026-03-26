import Bull from 'bull';

import { env } from '../infrastructure/config/env';
import { createContainer } from '../infrastructure/container';
import { logger } from '../infrastructure/logging/logger';
import { BullJobDispatcher, DOCUMENT_JOB_NAME, DocumentJob } from '../infrastructure/queue/bull-job-dispatcher';

const start = async (): Promise<void> => {
  process.env.WORKER_PROCESS = 'true';
  const container = await createContainer();

  if (!(container.jobDispatcher instanceof BullJobDispatcher)) {
    logger.warn('Worker started in memory-fallback mode, no Bull queue available.');
    return;
  }

  const queue = container.jobDispatcher.queue;
  const deadLetterQueue = new Bull(env.DLQ_NAME, env.REDIS_URL);

  queue.process(DOCUMENT_JOB_NAME, env.WORKER_CONCURRENCY, async (job: DocumentJob) => {
    logger.info({ batchId: job.data.batchId, documentId: job.data.documentId, attempt: job.attemptsMade + 1 }, 'Processing document job');
    await container.generateDocumentUseCase.execute(job.data);
    await container.generateDocumentUseCase.finalizeBatch(job.data.batchId);
    container.metrics.documentsGeneratedTotal.inc({
      document_type: job.data.documentType,
      status: 'completed',
    });
  });

  queue.on('failed', async (job: DocumentJob | undefined, error: Error) => {
    logger.error(
      { batchId: job?.data.batchId, documentId: job?.data.documentId, err: error, attemptsMade: job?.attemptsMade },
      'Document job failed',
    );

    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      // Business rule: only terminal failures enter the DLQ. Earlier failures are expected to be
      // handled by Bull retries with exponential backoff.
      await deadLetterQueue.add('document.dead-letter', job.data, {
        removeOnComplete: 1000,
      });
      container.metrics.documentsGeneratedTotal.inc({
        document_type: job.data.documentType,
        status: 'failed',
      });
      await container.generateDocumentUseCase.finalizeBatch(job.data.batchId);
    }
  });

  queue.on('completed', async (job: DocumentJob) => {
    const batch = await container.getBatchUseCase.execute(job.data.batchId).catch(() => undefined);
    if (batch && batch.totalDocuments === batch.completedDocuments + batch.failedDocuments) {
      // Technical decision: batch duration is emitted only once the batch is fully terminal to avoid
      // partial timings that would distort Prometheus histograms.
      container.metrics.batchProcessingDurationSeconds.observe(
        { document_type: batch.documentType, status: batch.status },
        Math.max(0.001, (Date.now() - new Date(batch.createdAt).getTime()) / 1000),
      );
    }
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Queue worker graceful shutdown initiated.');
    await queue.close();
    await deadLetterQueue.close();
    await container.redis?.quit().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'Queue worker started');
};

void start();
