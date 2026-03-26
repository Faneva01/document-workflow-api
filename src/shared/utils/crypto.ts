import { createHash, randomUUID } from 'node:crypto';

export const generateId = (): string => randomUUID();

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
