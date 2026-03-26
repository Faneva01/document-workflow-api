import { EventEmitter } from 'node:events';

import { DocumentJobPayload, JobDispatcher } from '../../application/ports/job-dispatcher';

export class InMemoryJobDispatcher extends EventEmitter implements JobDispatcher {
  private readonly queue: DocumentJobPayload[] = [];

  public async enqueueDocument(payload: DocumentJobPayload): Promise<void> {
    this.queue.push(payload);
    this.emit('job', payload);
  }

  public async getQueueSize(): Promise<number> {
    return this.queue.length;
  }
}
