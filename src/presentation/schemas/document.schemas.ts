import { z } from 'zod';

export const createBatchSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(1000),
  documentType: z.string().trim().min(1).default('cerfa'),
  priority: z.number().int().min(1).max(5).default(3),
});

export const batchIdSchema = z.object({
  batchId: z.string().uuid(),
});

export const documentIdSchema = z.object({
  documentId: z.string().uuid(),
});
