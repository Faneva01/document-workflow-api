import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '../../infrastructure/logging/logger';
import { AppError } from '../../shared/errors/app-error';

export const errorHandler = (error: unknown, req: Request, res: Response, _: NextFunction): void => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(error instanceof Error ? error.message : 'Internal server error.', StatusCodes.INTERNAL_SERVER_ERROR);

  logger.error(
    {
      err: error,
      path: req.path,
      method: req.method,
      code: appError.code,
      details: appError.details,
    },
    appError.message,
  );

  res.status(appError.statusCode).json({
    error: {
      message: appError.message,
      code: appError.code,
      details: appError.details,
    },
  });
};
