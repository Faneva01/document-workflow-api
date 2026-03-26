import { createReadStream, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';

import { BatchStatus } from '../../domain/enums/batch-status';
import { DocumentStatus } from '../../domain/enums/document-status';
import { AppError } from '../../shared/errors/app-error';
import { withTimeout } from '../../shared/utils/async';
import { BatchRepository } from '../ports/batch-repository';
import { DocumentRepository } from '../ports/document-repository';
import { DocumentStorage } from '../ports/document-storage';
import { ExternalSignatureService } from '../ports/external-signature-service';
import { TemplateRenderer } from '../ports/template-renderer';

export interface PdfThreadRunner {
  generatePdf(payload: { documentId: string; renderedContent: string; filename: string }): Promise<{ filePath: string }>;
}

export class GenerateDocumentUseCase {
  public constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly batchRepository: BatchRepository,
    private readonly templateRenderer: TemplateRenderer,
    private readonly externalSignatureService: ExternalSignatureService,
    private readonly documentStorage: DocumentStorage,
    private readonly pdfThreadRunner: PdfThreadRunner,
    private readonly pdfTimeoutMs: number,
  ) {}

  public async execute(payload: {
    batchId: string;
    documentId: string;
    userId: string;
    documentType: string;
  }): Promise<void> {
    const filename = `${payload.documentType}-${payload.userId}-${payload.documentId}.pdf`;
    let generatedFilePath: string | undefined;

    // Business rule: as soon as a worker starts handling the job we expose that transition so batch
    // monitoring reflects real progress instead of staying artificially pending.
    await this.documentRepository.updateStatus(payload.documentId, DocumentStatus.Processing, {
      errorMessage: undefined,
    });

    try {
      await this.externalSignatureService.prepareEnvelope(payload);

      const renderedContent = await this.templateRenderer.render({
        documentType: payload.documentType,
        data: {
          userId: payload.userId,
          documentId: payload.documentId,
          batchId: payload.batchId,
          generatedAt: new Date().toISOString(),
        },
      });

      const pdfResult = await withTimeout(
        this.pdfThreadRunner.generatePdf({
          documentId: payload.documentId,
          renderedContent,
          filename,
        }),
        this.pdfTimeoutMs,
        'PDF generation timed out.',
      );
      generatedFilePath = pdfResult.filePath;

      // Technical decision: stream the generated file straight into GridFS to avoid keeping full PDFs
      // in memory when the system is handling hundreds of documents concurrently.
      const fileStream = createReadStream(generatedFilePath);
      const stored = await this.documentStorage.storePdf({
        documentId: payload.documentId,
        filename,
        metadata: {
          batchId: payload.batchId,
          userId: payload.userId,
          documentType: payload.documentType,
        },
        stream: fileStream,
      });

      await this.documentRepository.updateStatus(payload.documentId, DocumentStatus.Completed, {
        storageFileId: stored.fileId,
        filename: stored.filename,
        errorMessage: undefined,
      });
      await this.batchRepository.incrementCompleted(payload.batchId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown document generation error.';
      await this.documentRepository.updateStatus(payload.documentId, DocumentStatus.Failed, {
        errorMessage: message,
      });
      await this.batchRepository.incrementFailed(payload.batchId);
      throw new AppError(message);
    } finally {
      // Workaround: worker threads render to a temporary file first because PDFKit writes to streams
      // incrementally; this cleanup guarantees we do not leak temp artifacts on retries or failures.
      if (generatedFilePath && existsSync(generatedFilePath)) {
        await unlink(generatedFilePath).catch(() => undefined);
      }
    }
  }

  public async finalizeBatch(batchId: string): Promise<void> {
    const documents = await this.documentRepository.findByBatchId(batchId);
    // Business rule: a batch is terminal only when every document has left pending/processing.
    const hasPending = documents.some((document) =>
      [DocumentStatus.Pending, DocumentStatus.Processing].includes(document.status),
    );
    if (hasPending) {
      return;
    }

    const hasFailure = documents.some((document) => document.status === DocumentStatus.Failed);
    await this.batchRepository.updateStatus(batchId, hasFailure ? BatchStatus.Failed : BatchStatus.Completed);
  }
}
