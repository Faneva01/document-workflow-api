import { DocumentController } from '../../src/presentation/controllers/document.controller';
import { createBatchSchema } from '../../src/presentation/schemas/document.schemas';

describe('DocumentController integration', () => {
  it('validates and sanitizes a valid batch payload', async () => {
    const createBatchUseCase = {
      execute: jest.fn().mockResolvedValue({ batchId: '8bd115a4-9d04-4292-bec7-31b19017f378' }),
    };
    const controller = new DocumentController(createBatchUseCase as never, {} as never, {} as never);

    const body = createBatchSchema.parse({
      userIds: [' user-1 ', 'user-2<script>'],
      documentType: 'cerfa',
      priority: 3,
    });

    const req = {
      id: 'corr-1',
      body,
      header: jest.fn().mockReturnValue('idem-1'),
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.createBatch(req, res);

    expect(createBatchUseCase.execute).toHaveBeenCalledWith(
      {
        userIds: ['user-1', 'user-2script'],
        documentType: 'cerfa',
        priority: 3,
      },
      'corr-1',
      'idem-1',
    );
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('rejects invalid payload at schema level', () => {
    const result = createBatchSchema.safeParse({
      userIds: [],
    });

    expect(result.success).toBe(false);
  });
});
