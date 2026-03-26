import { BatchEntity } from '../../domain/entities/batch';

export interface BatchRepository {
  create(batch: BatchEntity): Promise<void>;
  findById(id: string): Promise<BatchEntity | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<BatchEntity | null>;
  incrementCompleted(batchId: string): Promise<void>;
  incrementFailed(batchId: string): Promise<void>;
  markProcessing(batchId: string): Promise<void>;
  updateStatus(batchId: string, status: BatchEntity['status']): Promise<void>;
}
