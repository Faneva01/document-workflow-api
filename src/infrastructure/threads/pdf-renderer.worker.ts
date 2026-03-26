import { mkdirSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';

import PDFDocument from 'pdfkit';

interface WorkerInput {
  documentId: string;
  filename: string;
  renderedContent: string;
}

const input = workerData as WorkerInput;
const tempDir = join(process.cwd(), 'tmp');
mkdirSync(tempDir, { recursive: true });
const filePath = join(tempDir, `${input.documentId}.pdf`);

const doc = new PDFDocument({ compress: true, size: 'A4', margin: 48 });
const output = createWriteStream(filePath);

doc.pipe(output);
doc.fontSize(18).text('Generated Document', { underline: true });
doc.moveDown();
doc.fontSize(11).text(input.renderedContent);
doc.moveDown();
doc.fontSize(10).text(`Filename: ${input.filename}`);
doc.end();

output.on('finish', () => {
  parentPort?.postMessage({ filePath });
});

output.on('error', (error) => {
  throw error;
});
