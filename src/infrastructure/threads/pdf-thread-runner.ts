import { Worker } from 'node:worker_threads';
import { join } from 'node:path';

import { PdfThreadRunner } from '../../application/use-cases/generate-document.use-case';

export class WorkerThreadPdfRunner implements PdfThreadRunner {
  public async generatePdf(payload: {
    documentId: string;
    renderedContent: string;
    filename: string;
  }): Promise<{ filePath: string }> {
    return await new Promise<{ filePath: string }>((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'pdf-renderer.worker.js'), {
        workerData: payload,
      });

      worker.once('message', (result) => resolve(result as { filePath: string }));
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`PDF worker exited with code ${code}.`));
        }
      });
    });
  }
}
