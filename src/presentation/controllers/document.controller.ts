import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { CreateBatchUseCase } from '../../application/use-cases/create-batch.use-case';
import { GetBatchUseCase } from '../../application/use-cases/get-batch.use-case';
import { GetDocumentUseCase } from '../../application/use-cases/get-document.use-case';
import { sanitizeUserIds } from '../../infrastructure/validation/sanitizers';

export class DocumentController {
  public constructor(
    private readonly createBatchUseCase: CreateBatchUseCase,
    private readonly getBatchUseCase: GetBatchUseCase,
    private readonly getDocumentUseCase: GetDocumentUseCase,
  ) {}

  public createBatch = async (req: Request, res: Response): Promise<void> => {
    const correlationId = String(req.id);
    const result = await this.createBatchUseCase.execute(
      {
        // Security rule: userIds are sanitized again at the edge even after schema validation so the
        // persistence and templating layers never receive unsafe identifier characters.
        ...req.body,
        userIds: sanitizeUserIds(req.body.userIds),
      },
      correlationId,
      req.header('x-idempotency-key'),
    );

    res.status(StatusCodes.ACCEPTED).json(result);
  };

  public getBatch = async (req: Request, res: Response): Promise<void> => {
    const batch = await this.getBatchUseCase.execute(String(req.params.batchId));
    res.status(StatusCodes.OK).json(batch);
  };

  public getDocument = async (req: Request, res: Response): Promise<void> => {
    const { stream, filename } = await this.getDocumentUseCase.execute(String(req.params.documentId));
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  };
}
