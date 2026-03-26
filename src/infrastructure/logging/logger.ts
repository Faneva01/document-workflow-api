import { AsyncLocalStorage } from 'node:async_hooks';

import pino from 'pino';

import { env } from '../config/env';
import { RequestContext } from '../../shared/types/request-context';

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  mixin(): Record<string, string> {
    const context = requestContextStorage.getStore();
    return context
      ? {
          correlationId: context.correlationId,
          ...(context.batchId ? { batchId: context.batchId } : {}),
          ...(context.documentId ? { documentId: context.documentId } : {}),
        }
      : {};
  },
});
