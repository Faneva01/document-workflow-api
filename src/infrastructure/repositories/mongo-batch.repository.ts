import { Collection } from 'mongodb';

import { BatchRepository } from '../../application/ports/batch-repository';
import { BatchEntity } from '../../domain/entities/batch';
import { BatchStatus } from '../../domain/enums/batch-status';

export class MongoBatchRepository implements BatchRepository {
  public constructor(private readonly collection: Collection<BatchEntity>) {}

  public async create(batch: BatchEntity): Promise<void> {
    await this.collection.insertOne(batch);
  }

  public async findById(id: string): Promise<BatchEntity | null> {
    return this.collection.findOne({ id });
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<BatchEntity | null> {
    return this.collection.findOne({ idempotencyKey });
  }

  public async incrementCompleted(batchId: string): Promise<void> {
    await this.collection.updateOne(
      { id: batchId },
      {
        $inc: { completedDocuments: 1 },
        $set: { updatedAt: new Date() },
      },
    );
  }

  public async incrementFailed(batchId: string): Promise<void> {
    await this.collection.updateOne(
      { id: batchId },
      {
        $inc: { failedDocuments: 1 },
        $set: { updatedAt: new Date() },
      },
    );
  }

  public async markProcessing(batchId: string): Promise<void> {
    await this.updateStatus(batchId, BatchStatus.Processing);
  }

  public async updateStatus(batchId: string, status: BatchStatus): Promise<void> {
    await this.collection.updateOne({ id: batchId }, { $set: { status, updatedAt: new Date() } });
  }
}
