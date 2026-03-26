import { Collection } from 'mongodb';

import { DocumentRepository } from '../../application/ports/document-repository';
import { DocumentEntity } from '../../domain/entities/document';

export class MongoDocumentRepository implements DocumentRepository {
  public constructor(private readonly collection: Collection<DocumentEntity>) {}

  public async createMany(documents: DocumentEntity[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    await this.collection.insertMany(documents, { ordered: false });
  }

  public async findByBatchId(batchId: string): Promise<DocumentEntity[]> {
    return this.collection.find({ batchId }).sort({ createdAt: 1 }).toArray();
  }

  public async findById(documentId: string): Promise<DocumentEntity | null> {
    return this.collection.findOne({ id: documentId });
  }

  public async updateStatus(
    documentId: string,
    status: DocumentEntity['status'],
    fields?: Partial<DocumentEntity>,
  ): Promise<void> {
    await this.collection.updateOne(
      { id: documentId },
      {
        $set: {
          status,
          ...fields,
          updatedAt: new Date(),
        },
        $inc: {
          attempts: status === 'processing' ? 1 : 0,
        },
      },
    );
  }
}
