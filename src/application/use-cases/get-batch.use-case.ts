import { StatusCodes } from 'http-status-codes';

import { AppError } from '../../shared/errors/app-error';
import { ErrorCodes } from '../../shared/errors/error-codes';
import { BatchResponseDto } from '../dto/batch-response.dto';
import { BatchRepository } from '../ports/batch-repository';
import { DocumentRepository } from '../ports/document-repository';

export class GetBatchUseCase {
  public constructor(
    private readonly batchRepository: BatchRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  public async execute(batchId: string): Promise<BatchResponseDto> {
    const batch = await this.batchRepository.findById(batchId);
    if (!batch) {
      throw new AppError('Batch not found.', StatusCodes.NOT_FOUND, ErrorCodes.notFound);
    }

    const documents = await this.documentRepository.findByBatchId(batchId);

    return {
      id: batch.id,
      status: batch.status,
      documentType: batch.documentType,
      totalDocuments: batch.totalDocuments,
      completedDocuments: batch.completedDocuments,
      failedDocuments: batch.failedDocuments,
      documents: documents.map((document) => ({
        id: document.id,
        userId: document.userId,
        documentType: document.documentType,
        status: document.status,
        filename: document.filename,
        errorMessage: document.errorMessage,
        attempts: document.attempts,
      })),
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }
}
