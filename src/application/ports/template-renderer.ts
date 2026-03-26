export interface TemplateRenderInput {
  documentType: string;
  data: Record<string, string>;
}

export interface TemplateRenderer {
  render(input: TemplateRenderInput): Promise<string>;
}
