import { InMemoryJobDispatcher } from './memory-job-dispatcher';
import { GenerateDocumentUseCase } from '../../application/use-cases/generate-document.use-case';
import { logger } from '../logging/logger';

export const startInMemoryProcessor = (
  dispatcher: InMemoryJobDispatcher,
  generateDocumentUseCase: GenerateDocumentUseCase,
  concurrency: number,
): void => {
  let active = 0;
  const backlog: Parameters<InMemoryJobDispatcher['enqueueDocument']>[0][] = [];

  const drain = (): void => {
    // Workaround: this bounded loop emulates worker concurrency when Redis/Bull is down. It is a
    // deliberate degradation path, not a replacement for the durable queue.
    while (active < concurrency && backlog.length > 0) {
      const payload = backlog.shift();
      if (!payload) {
        return;
      }

      active += 1;
      void generateDocumentUseCase
        .execute(payload)
        .then(() => generateDocumentUseCase.finalizeBatch(payload.batchId))
        .catch((error) => {
          logger.error({ err: error, batchId: payload.batchId, documentId: payload.documentId }, 'In-memory job failed');
        })
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  dispatcher.on('job', (payload) => {
    backlog.push(payload);
    drain();
  });
};
