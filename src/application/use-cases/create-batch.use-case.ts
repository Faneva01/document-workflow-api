import { StatusCodes } from 'http-status-codes';

import { BatchEntity } from '../../domain/entities/batch';
import { DocumentEntity } from '../../domain/entities/document';
import { BatchStatus } from '../../domain/enums/batch-status';
import { DocumentStatus } from '../../domain/enums/document-status';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCodes } from '../../shared/errors/error-codes';
import { generateId } from '../../shared/utils/crypto';
import { now } from '../../shared/utils/time';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { BatchRepository } from '../ports/batch-repository';
import { DocumentRepository } from '../ports/document-repository';
import { JobDispatcher } from '../ports/job-dispatcher';
import { IdempotencyService } from '../services/idempotency.service';

export class CreateBatchUseCase {
  public constructor(
    private readonly batchRepository: BatchRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly jobDispatcher: JobDispatcher,
    private readonly idempotencyService: IdempotencyService,
    private readonly queueBackpressureLimit: number,
  ) {}

  public async execute(dto: CreateBatchDto, correlationId: string, idempotencyHeader?: string): Promise<{ batchId: string }> {
    const queueSize = await this.jobDispatcher.getQueueSize();
    // Operational safeguard: refuse new batches when the queue is already saturated instead of
    // accepting work we know we cannot drain within a reasonable latency budget.
    if (queueSize > this.queueBackpressureLimit) {
      throw new AppError(
        'Queue is under backpressure, retry later.',
        StatusCodes.TOO_MANY_REQUESTS,
        ErrorCodes.overloaded,
        { queueSize, queueBackpressureLimit: this.queueBackpressureLimit },
      );
    }

    const idempotencyKey = this.idempotencyService.resolveKey(dto, idempotencyHeader);
    const existingBatch = await this.batchRepository.findByIdempotencyKey(idempotencyKey);
    // Business rule: batch creation is idempotent. Returning the existing batchId lets clients retry
    // safely after network failures without creating duplicate documents.
    if (existingBatch) {
      return { batchId: existingBatch.id };
    }

    const createdAt = now();
    const batchId = generateId();
    const batch: BatchEntity = {
      id: batchId,
      status: BatchStatus.Pending,
      documentType: dto.documentType,
      userIds: dto.userIds,
      totalDocuments: dto.userIds.length,
      completedDocuments: 0,
      failedDocuments: 0,
      idempotencyKey,
      correlationId,
      createdAt,
      updatedAt: createdAt,
    };

    const documents: DocumentEntity[] = dto.userIds.map((userId) => ({
      id: generateId(),
      batchId,
      userId,
      documentType: dto.documentType,
      status: DocumentStatus.Pending,
      attempts: 0,
      correlationId,
      createdAt,
      updatedAt: createdAt,
    }));

    await this.batchRepository.create(batch);
    await this.documentRepository.createMany(documents);
    // Technical decision: we flip the batch to processing only after metadata exists in MongoDB so
    // observability endpoints never expose a processing batch with missing document records.
    await this.batchRepository.markProcessing(batchId);

    await Promise.all(
      documents.map((document) =>
        this.jobDispatcher.enqueueDocument({
          batchId,
          documentId: document.id,
          userId: document.userId,
          documentType: document.documentType,
          correlationId,
          priority: dto.priority,
        }),
      ),
    );

    return { batchId };
  }
}
