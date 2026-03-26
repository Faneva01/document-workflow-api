import { Db, MongoClient } from 'mongodb';

import { env } from '../config/env';
import { logger } from '../logging/logger';

export class MongoConnection {
  private client?: MongoClient;
  private db?: Db;

  public async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    this.client = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      retryWrites: true,
    });

    await this.client.connect();
    this.db = this.client.db(env.DB_NAME);
    logger.info({ dbName: env.DB_NAME }, 'MongoDB connected');
    return this.db;
  }

  public async close(): Promise<void> {
    await this.client?.close();
  }
}
