import { IdempotencyService } from '../../src/application/services/idempotency.service';

describe('IdempotencyService', () => {
  it('uses header key when provided', () => {
    const service = new IdempotencyService();

    expect(
      service.resolveKey(
        {
          userIds: ['u1'],
          documentType: 'cerfa',
          priority: 3,
        },
        'custom-key',
      ),
    ).toBe('custom-key');
  });

  it('generates the same key regardless of userId order', () => {
    const service = new IdempotencyService();

    const keyA = service.resolveKey({
      userIds: ['u2', 'u1'],
      documentType: 'cerfa',
      priority: 3,
    });
    const keyB = service.resolveKey({
      userIds: ['u1', 'u2'],
      documentType: 'cerfa',
      priority: 1,
    });

    expect(keyA).toBe(keyB);
  });
});
