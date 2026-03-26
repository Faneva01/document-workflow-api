import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodSchema } from 'zod';

import { AppError } from '../../shared/errors/app-error';
import { ErrorCodes } from '../../shared/errors/error-codes';

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError('Invalid request body.', StatusCodes.BAD_REQUEST, ErrorCodes.validation, result.error.flatten()));
      return;
    }

    req.body = result.data;
    next();
  };

export const validateParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(
        new AppError('Invalid request parameters.', StatusCodes.BAD_REQUEST, ErrorCodes.validation, result.error.flatten()),
      );
      return;
    }

    req.params = result.data as Request['params'];
    next();
  };
