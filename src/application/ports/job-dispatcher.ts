export interface DocumentJobPayload {
  batchId: string;
  documentId: string;
  userId: string;
  documentType: string;
  correlationId: string;
  priority: number;
}

export interface JobDispatcher {
  enqueueDocument(payload: DocumentJobPayload): Promise<void>;
  getQueueSize(): Promise<number>;
}
