import { BatchStatus } from '../../domain/enums/batch-status';
import { DocumentStatus } from '../../domain/enums/document-status';

export interface BatchDocumentResponseDto {
  id: string;
  userId: string;
  documentType: string;
  status: DocumentStatus;
  filename?: string | undefined;
  errorMessage?: string | undefined;
  attempts: number;
}

export interface BatchResponseDto {
  id: string;
  status: BatchStatus;
  documentType: string;
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  documents: BatchDocumentResponseDto[];
  createdAt: string;
  updatedAt: string;
}
