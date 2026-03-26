import cluster from 'node:cluster';

import { env } from './infrastructure/config/env';
import { bootstrapClusters, createContainer, shouldSpawnClusters } from './infrastructure/container';
import { logger } from './infrastructure/logging/logger';
import { InMemoryJobDispatcher } from './infrastructure/queue/memory-job-dispatcher';
import { startInMemoryProcessor } from './infrastructure/queue/in-memory-processor';

const start = async (): Promise<void> => {
  try {
    if (shouldSpawnClusters()) {
      bootstrapClusters();
      logger.info({ workers: env.API_CLUSTER_WORKERS }, 'API cluster started');
      return;
    }

    const container = await createContainer();
    if (container.jobDispatcher instanceof InMemoryJobDispatcher) {
      startInMemoryProcessor(container.jobDispatcher, container.generateDocumentUseCase, env.WORKER_CONCURRENCY);
    }
    const server = container.app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, workerId: cluster.worker?.id }, 'HTTP server listening');
    });

    const shutdown = async (): Promise<void> => {
      logger.info('Graceful shutdown initiated.');
      server.close(async () => {
        await container.redis?.quit().catch(() => undefined);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown());
    process.on('SIGINT', () => void shutdown());
  } catch (error) {
    logger.error(
      {
        err: error,
        mongoUri: env.MONGODB_URI,
        redisUrl: env.REDIS_URL,
      },
      'Application startup failed. Ensure MongoDB and Redis are reachable, or run the stack with Docker Compose.',
    );
    process.exit(1);
  }
};

void start();
