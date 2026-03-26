export interface ExternalSignatureService {
  prepareEnvelope(payload: { batchId: string; documentId: string; userId: string }): Promise<{ envelopeId: string }>;
}
