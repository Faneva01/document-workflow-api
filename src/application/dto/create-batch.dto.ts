export interface CreateBatchDto {
  userIds: string[];
  documentType: string;
  priority: number;
  idempotencyKey?: string;
}
