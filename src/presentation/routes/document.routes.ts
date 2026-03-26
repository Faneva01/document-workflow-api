import { Router } from 'express';

import { DocumentController } from '../controllers/document.controller';
import { batchIdSchema, createBatchSchema, documentIdSchema } from '../schemas/document.schemas';
import { validateBody, validateParams } from '../middlewares/validate-request.middleware';

export const createDocumentRouter = (controller: DocumentController): Router => {
  const router = Router();

  router.post('/batch', validateBody(createBatchSchema), controller.createBatch);
  router.get('/batch/:batchId', validateParams(batchIdSchema), controller.getBatch);
  router.get('/:documentId', validateParams(documentIdSchema), controller.getDocument);

  return router;
};
