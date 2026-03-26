import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/document-platform'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  DB_NAME: z.string().min(1).default('document-platform'),
  GRIDFS_BUCKET: z.string().min(1).default('documents'),
  QUEUE_NAME: z.string().min(1).default('document-generation'),
  DLQ_NAME: z.string().min(1).default('document-generation-dlq'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(16),
  API_CLUSTER_WORKERS: z.coerce.number().int().positive().default(2),
  QUEUE_BACKPRESSURE_LIMIT: z.coerce.number().int().positive().default(5000),
  PDF_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  EXTERNAL_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(800),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ENABLE_SWAGGER: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
