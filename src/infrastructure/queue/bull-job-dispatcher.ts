import Bull, { Job, Queue } from 'bull';
import { URL } from 'node:url';

import { DocumentJobPayload, JobDispatcher } from '../../application/ports/job-dispatcher';

export const DOCUMENT_JOB_NAME = 'document.generate';

export class BullJobDispatcher implements JobDispatcher {
  public constructor(public readonly queue: Queue<DocumentJobPayload>) {}

  public async enqueueDocument(payload: DocumentJobPayload): Promise<void> {
    await this.queue.add(DOCUMENT_JOB_NAME, payload, {
      priority: payload.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 250,
      },
      removeOnComplete: 2000,
      removeOnFail: 5000,
      jobId: `${payload.batchId}:${payload.documentId}`,
    });
  }

  public async getQueueSize(): Promise<number> {
    const counts = await this.queue.getJobCounts();
    return (counts.active ?? 0) + (counts.waiting ?? 0) + (counts.delayed ?? 0);
  }
}

export type DocumentJob = Job<DocumentJobPayload>;

export const createBullQueue = (name: string, redisUrl: string): Queue<DocumentJobPayload> => {
  const parsedUrl = new URL(redisUrl);
  return new Bull<DocumentJobPayload>(name, {
    redis: {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      password: parsedUrl.password || undefined,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 250,
      },
    },
    settings: {
      lockDuration: 30000,
      stalledInterval: 30000,
    },
  });
};
