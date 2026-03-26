import { Db } from 'mongodb';
import Redis from 'ioredis';

import { HealthIndicatorResult } from '../../application/ports/health-indicator';
import { JobDispatcher } from '../../application/ports/job-dispatcher';

export class HealthService {
  public constructor(
    private readonly db: Db,
    private readonly redis: Redis | null,
    private readonly jobDispatcher: JobDispatcher,
  ) {}

  public async check(): Promise<{ status: 'ok' | 'degraded'; services: HealthIndicatorResult[] }> {
    const mongo = await this.db.command({ ping: 1 });
    const redisStatus = this.redis ? await this.redis.ping() : 'MEMORY_FALLBACK';
    const queueSize = await this.jobDispatcher.getQueueSize();

    const services: HealthIndicatorResult[] = [
      { name: 'mongodb', status: mongo.ok === 1 ? 'up' : 'down' },
      {
        name: 'redis',
        status: redisStatus === 'PONG' ? 'up' : 'degraded',
        details: { mode: redisStatus === 'PONG' ? 'redis' : 'memory-fallback' },
      },
      { name: 'queue', status: 'up', details: { queueSize } },
    ];

    const degraded = services.some((service) => service.status !== 'up');
    return {
      status: degraded ? 'degraded' : 'ok',
      services,
    };
  }
}
