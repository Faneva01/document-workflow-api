import { DocumentEntity } from '../../domain/entities/document';

export interface DocumentRepository {
  createMany(documents: DocumentEntity[]): Promise<void>;
  findByBatchId(batchId: string): Promise<DocumentEntity[]>;
  findById(documentId: string): Promise<DocumentEntity | null>;
  updateStatus(documentId: string, status: DocumentEntity['status'], fields?: Partial<DocumentEntity>): Promise<void>;
}
