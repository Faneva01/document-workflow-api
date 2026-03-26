import { DocumentStatus } from '../enums/document-status';

export interface DocumentEntity {
  id: string;
  batchId: string;
  userId: string;
  documentType: string;
  status: DocumentStatus;
  storageFileId?: string | undefined;
  filename?: string | undefined;
  attempts: number;
  correlationId: string;
  errorMessage?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}
