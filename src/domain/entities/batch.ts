import { BatchStatus } from '../enums/batch-status';

export interface BatchEntity {
  id: string;
  status: BatchStatus;
  documentType: string;
  userIds: string[];
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  idempotencyKey: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}
