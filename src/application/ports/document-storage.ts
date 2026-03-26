import { Readable } from 'node:stream';

export interface StorePdfInput {
  documentId: string;
  filename: string;
  metadata: Record<string, string>;
  stream: Readable;
}

export interface StoredPdfDescriptor {
  fileId: string;
  filename: string;
}

export interface DocumentStorage {
  storePdf(input: StorePdfInput): Promise<StoredPdfDescriptor>;
  getPdfStream(fileId: string): Readable;
}
