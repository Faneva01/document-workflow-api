import { TemplateRenderer, TemplateRenderInput } from '../../application/ports/template-renderer';

type CompiledTemplate = (data: Record<string, string>) => string;

export class TemplateRegistry implements TemplateRenderer {
  private readonly templates = new Map<string, CompiledTemplate>();

  public constructor() {
    this.register(
      'cerfa',
      (data) =>
        `CERFA DOCUMENT\nBatch: ${data.batchId}\nDocument: ${data.documentId}\nUser: ${data.userId}\nGenerated: ${data.generatedAt}`,
    );
    this.register(
      'convention',
      (data) =>
        `CONVENTION DOCUMENT\nUser ${data.userId}\nReference ${data.documentId}\nBatch ${data.batchId}\nIssued ${data.generatedAt}`,
    );
  }

  public register(documentType: string, template: CompiledTemplate): void {
    this.templates.set(documentType, template);
  }

  public async render(input: TemplateRenderInput): Promise<string> {
    const template = this.templates.get(input.documentType) ?? this.templates.get('cerfa');
    if (!template) {
      throw new Error(`No template found for document type ${input.documentType}.`);
    }

    return template(input.data);
  }
}
