import { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';

import { logger, requestContextStorage } from '../../infrastructure/logging/logger';
import { generateId } from '../../shared/utils/crypto';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => String(req.headers['x-correlation-id'] ?? generateId()),
});

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = String(req.id ?? req.headers['x-correlation-id'] ?? generateId());
  res.setHeader('x-correlation-id', correlationId);

  requestContextStorage.run({ correlationId }, () => {
    next();
  });
};
