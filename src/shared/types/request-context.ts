export interface RequestContext {
  correlationId: string;
  batchId?: string;
  documentId?: string;
}
