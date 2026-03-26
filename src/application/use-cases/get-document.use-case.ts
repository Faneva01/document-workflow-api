import { Readable } from 'node:stream';

import { StatusCodes } from 'http-status-codes';

import { AppError } from '../../shared/errors/app-error';
import { ErrorCodes } from '../../shared/errors/error-codes';
import { DocumentRepository } from '../ports/document-repository';
import { DocumentStorage } from '../ports/document-storage';

export class GetDocumentUseCase {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentStorage: DocumentStorage,
  ) {}

  public async execute(documentId: string): Promise<{ stream: Readable; filename: string }> {
    const document = await this.documentRepository.findById(documentId);
    if (!document || !document.storageFileId || !document.filename) {
      throw new AppError('Document not found.', StatusCodes.NOT_FOUND, ErrorCodes.notFound);
    }

    return {
      stream: this.documentStorage.getPdfStream(document.storageFileId),
      filename: document.filename,
    };
  }
}
