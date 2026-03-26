import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const DOCUMENT_COUNT = Number(process.env.DOCUMENT_COUNT ?? 1000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 1000);
const REPORT_DIR = join(process.cwd(), 'reports');

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const main = async (): Promise<void> => {
  const startedAt = Date.now();
  const cpuStart = process.cpuUsage();
  const memoryStart = process.memoryUsage();

  const userIds = Array.from({ length: DOCUMENT_COUNT }, (_, index) => `user-${index + 1}`);
  const createResponse = await fetch(`${API_BASE_URL}/api/documents/batch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': `benchmark-${Date.now()}`,
    },
    body: JSON.stringify({
      userIds,
      documentType: 'cerfa',
      priority: 3,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Unable to create benchmark batch: ${createResponse.status} ${await createResponse.text()}`);
  }

  const { batchId } = (await createResponse.json()) as { batchId: string };

  let batchStatus = 'processing';
  let batchPayload: Record<string, unknown> | undefined;

  while (batchStatus === 'pending' || batchStatus === 'processing') {
    await sleep(POLL_INTERVAL_MS);
    const response = await fetch(`${API_BASE_URL}/api/documents/batch/${batchId}`);
    batchPayload = (await response.json()) as Record<string, unknown>;
    batchStatus = String(batchPayload.status);
  }

  const totalDurationMs = Date.now() - startedAt;
  const cpuDelta = process.cpuUsage(cpuStart);
  const memoryEnd = process.memoryUsage();
  const throughput = DOCUMENT_COUNT / Math.max(totalDurationMs / 1000, 0.001);

  const report = {
    executedAt: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    batchId,
    totalDurationMs,
    throughputDocumentsPerSecond: throughput,
    cpu: {
      userMicroseconds: cpuDelta.user,
      systemMicroseconds: cpuDelta.system,
    },
    memory: {
      rssStart: memoryStart.rss,
      rssEnd: memoryEnd.rss,
      heapUsedStart: memoryStart.heapUsed,
      heapUsedEnd: memoryEnd.heapUsed,
    },
    finalBatch: batchPayload,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(join(REPORT_DIR, 'benchmark-report.json'), JSON.stringify(report, null, 2), 'utf8');
  await writeFile(
    join(REPORT_DIR, 'benchmark-report.md'),
    [
      '# Benchmark Report',
      '',
      `- Executed at: ${report.executedAt}`,
      `- Batch ID: ${batchId}`,
      `- Total duration: ${totalDurationMs} ms`,
      `- Throughput: ${throughput.toFixed(2)} docs/sec`,
      `- CPU user/system: ${cpuDelta.user} / ${cpuDelta.system} microseconds`,
      `- Memory RSS start/end: ${memoryStart.rss} / ${memoryEnd.rss} bytes`,
      '',
      '## Final batch payload',
      '',
      '```json',
      JSON.stringify(batchPayload, null, 2),
      '```',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify(report, null, 2));
};

void main();
