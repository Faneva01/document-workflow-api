import { Express } from 'express';

import { createContainer } from './infrastructure/container';

export const buildApp = async (): Promise<Express> => {
  const container = await createContainer();
  return container.app;
};
