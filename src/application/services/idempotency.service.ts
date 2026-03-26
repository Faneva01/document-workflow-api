import { createHash } from 'node:crypto';

import { CreateBatchDto } from '../dto/create-batch.dto';

export class IdempotencyService {
  public resolveKey(dto: CreateBatchDto, headerKey?: string): string {
    // Technical decision: a caller-provided key always wins so upstream clients can safely retry
    // across deployments without depending on our internal hashing strategy.
    if (headerKey && headerKey.trim().length > 0) {
      return headerKey.trim();
    }

    // Business rule: the same logical batch must resolve to the same key even if userIds arrive
    // in a different order, otherwise harmless retries would create duplicate batches.
    const payload = JSON.stringify({
      documentType: dto.documentType,
      userIds: [...dto.userIds].sort(),
    });

    return createHash('sha256').update(payload).digest('hex');
  }
}
