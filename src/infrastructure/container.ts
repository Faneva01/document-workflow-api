import cluster from 'node:cluster';
import os from 'node:os';

import compression from 'compression';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import Redis from 'ioredis';
import { Db, GridFSBucket } from 'mongodb';
import swaggerUi from 'swagger-ui-express';

import { IdempotencyService } from '../application/services/idempotency.service';
import { CreateBatchUseCase } from '../application/use-cases/create-batch.use-case';
import { GenerateDocumentUseCase } from '../application/use-cases/generate-document.use-case';
import { GetBatchUseCase } from '../application/use-cases/get-batch.use-case';
import { GetDocumentUseCase } from '../application/use-cases/get-document.use-case';
import { openApiDocument } from './config/openapi';
import { env } from './config/env';
import { MongoConnection } from './db/mongo-client';
import { GridFsDocumentStorage } from './db/gridfs/gridfs-storage';
import { SimulatedSignatureService } from './external/simulated-signature.service';
import { HealthService } from './health/health.service';
import { logger } from './logging/logger';
import { MetricsRegistry } from './metrics/metrics-registry';
import { BullJobDispatcher, createBullQueue } from './queue/bull-job-dispatcher';
import { InMemoryJobDispatcher } from './queue/memory-job-dispatcher';
import { MongoBatchRepository } from './repositories/mongo-batch.repository';
import { MongoDocumentRepository } from './repositories/mongo-document.repository';
import { CircuitBreaker } from './resilience/circuit-breaker';
import { TemplateRegistry } from './templates/template-registry';
import { WorkerThreadPdfRunner } from './threads/pdf-thread-runner';
import { BatchEntity } from '../domain/entities/batch';
import { DocumentEntity } from '../domain/entities/document';
import { DocumentController } from '../presentation/controllers/document.controller';
import { errorHandler } from '../presentation/middlewares/error-handler.middleware';
import { httpLogger, requestContextMiddleware } from '../presentation/middlewares/request-context.middleware';
import { createDocumentRouter } from '../presentation/routes/document.routes';

export interface ApplicationContainer {
  app: Express;
  db: Db;
  redis: Redis | null;
  metrics: MetricsRegistry;
  documentController: DocumentController;
  healthService: HealthService;
  generateDocumentUseCase: GenerateDocumentUseCase;
  getBatchUseCase: GetBatchUseCase;
  jobDispatcher: BullJobDispatcher | InMemoryJobDispatcher;
}

export const shouldSpawnClusters = (): boolean =>
  cluster.isPrimary &&
  env.NODE_ENV === 'production' &&
  process.env.WORKER_PROCESS !== 'true';

export const bootstrapClusters = (): void => {
  // Technical decision: cluster only the API process. The Bull worker remains a separate process so
  // queue concurrency is tuned independently from HTTP concurrency.
  const workerCount = Math.min(env.API_CLUSTER_WORKERS, os.availableParallelism?.() ?? os.cpus().length);
  for (let index = 0; index < workerCount; index += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    logger.warn({ workerId: worker.id }, 'API worker exited, respawning.');
    cluster.fork();
  });
};

export const createContainer = async (): Promise<ApplicationContainer> => {
  const mongoConnection = new MongoConnection();
  const db = await mongoConnection.connect();

  const batches = db.collection<BatchEntity>('batches');
  const documents = db.collection<DocumentEntity>('documents');

  await Promise.all([
    batches.createIndex({ id: 1 }, { unique: true }),
    batches.createIndex({ idempotencyKey: 1 }, { unique: true }),
    documents.createIndex({ id: 1 }, { unique: true }),
    documents.createIndex({ batchId: 1 }),
    documents.createIndex({ batchId: 1, userId: 1, documentType: 1 }, { unique: true }),
  ]);

  const batchRepository = new MongoBatchRepository(batches);
  const documentRepository = new MongoDocumentRepository(documents);
  const bucket = new GridFSBucket(db, { bucketName: env.GRIDFS_BUCKET });
  const documentStorage = new GridFsDocumentStorage(bucket);
  const metrics = new MetricsRegistry();
  const templateRenderer = new TemplateRegistry();
  const signatureService = new SimulatedSignatureService(new CircuitBreaker());
  const pdfThreadRunner = new WorkerThreadPdfRunner();

  let redis: Redis | null = null;
  let jobDispatcher: BullJobDispatcher | InMemoryJobDispatcher;

  try {
    redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redis.connect();
    const queue = createBullQueue(env.QUEUE_NAME, env.REDIS_URL);
    jobDispatcher = new BullJobDispatcher(queue);
  } catch (error) {
    // Workaround / resilience mode: when Redis is unavailable we keep the API writable by switching
    // to an in-memory dispatcher. It is not durable across restarts, but it preserves degraded service.
    logger.warn({ err: error }, 'Redis unavailable, falling back to in-memory dispatcher.');
    redis = null;
    jobDispatcher = new InMemoryJobDispatcher();
  }

  const createBatchUseCase = new CreateBatchUseCase(
    batchRepository,
    documentRepository,
    jobDispatcher,
    new IdempotencyService(),
    env.QUEUE_BACKPRESSURE_LIMIT,
  );
  const getBatchUseCase = new GetBatchUseCase(batchRepository, documentRepository);
  const getDocumentUseCase = new GetDocumentUseCase(documentRepository, documentStorage);
  const generateDocumentUseCase = new GenerateDocumentUseCase(
    documentRepository,
    batchRepository,
    templateRenderer,
    signatureService,
    documentStorage,
    pdfThreadRunner,
    env.PDF_TIMEOUT_MS,
  );

  const documentController = new DocumentController(createBatchUseCase, getBatchUseCase, getDocumentUseCase);
  const healthService = new HealthService(db, redis, jobDispatcher);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(httpLogger);
  app.use(requestContextMiddleware);
  app.use('/api/documents', createDocumentRouter(documentController));
  app.get('/health', async (_req, res) => {
    const health = await healthService.check();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  });
  app.get('/metrics', async (_req, res) => {
    metrics.queueSize.set(await jobDispatcher.getQueueSize());
    res.setHeader('content-type', metrics.registry.contentType);
    res.end(await metrics.registry.metrics());
  });

  if (env.ENABLE_SWAGGER) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.use(errorHandler);

  return {
    app,
    db,
    redis,
    metrics,
    documentController,
    healthService,
    generateDocumentUseCase,
    getBatchUseCase,
    jobDispatcher,
  };
};
