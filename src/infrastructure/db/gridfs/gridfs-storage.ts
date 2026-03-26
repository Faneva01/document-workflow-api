import { Readable } from 'node:stream';
import { GridFSBucket, ObjectId } from 'mongodb';

import { DocumentStorage, StorePdfInput, StoredPdfDescriptor } from '../../../application/ports/document-storage';

export class GridFsDocumentStorage implements DocumentStorage {
  public constructor(private readonly bucket: GridFSBucket) {}

  public async storePdf(input: StorePdfInput): Promise<StoredPdfDescriptor> {
    const uploadStream = this.bucket.openUploadStream(input.filename, {
      contentType: 'application/pdf',
      metadata: {
        documentId: input.documentId,
        ...input.metadata,
      },
    });

    return await new Promise<StoredPdfDescriptor>((resolve, reject) => {
      input.stream
        .on('error', reject)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => {
          resolve({
            fileId: uploadStream.id.toString(),
            filename: input.filename,
          });
        });
    });
  }

  public getPdfStream(fileId: string): Readable {
    return this.bucket.openDownloadStream(new ObjectId(fileId));
  }
}
