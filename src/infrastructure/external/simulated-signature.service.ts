import { ExternalSignatureService } from '../../application/ports/external-signature-service';
import { sleep, withTimeout } from '../../shared/utils/async';
import { sha256 } from '../../shared/utils/crypto';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { env } from '../config/env';

export class SimulatedSignatureService implements ExternalSignatureService {
  public constructor(private readonly circuitBreaker: CircuitBreaker) {}

  public async prepareEnvelope(payload: { batchId: string; documentId: string; userId: string }): Promise<{ envelopeId: string }> {
    return this.circuitBreaker.execute(async () => {
      return withTimeout(
        (async () => {
          // Technical decision: we inject controlled latency and a small failure rate to exercise the
          // retry/circuit-breaker path without depending on a real third-party sandbox.
          const pseudoLatency = 40 + Math.floor(Math.random() * 120);
          await sleep(pseudoLatency);

          if (Math.random() < 0.03) {
            throw new Error('Simulated DocuSign transient failure.');
          }

          return {
            envelopeId: sha256(`${payload.batchId}:${payload.documentId}:${payload.userId}`).slice(0, 24),
          };
        })(),
        env.EXTERNAL_CALL_TIMEOUT_MS,
        'External signature service timed out.',
      );
    });
  }
}
