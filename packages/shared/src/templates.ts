export const VALID_TEMPLATES = [
  'template1',
  'template2',
  'template3',
  'template4',
  'template5',
  'template6',
  'template7',
] as const;

export type ResumeTemplateId = (typeof VALID_TEMPLATES)[number];

export const TEMPLATE_LABELS: Record<ResumeTemplateId, string> = {
  template1: 'Template 1',
  template2: 'Template 2',
  template3: 'Template 3',
  template4: 'Template 4',
  template5: 'Template 5',
  template6: 'Template 6',
  template7: 'Template 7',
};

export function isValidTemplate(value: string): value is ResumeTemplateId {
  return (VALID_TEMPLATES as readonly string[]).includes(value);
}

export function getTemplateLabel(templateId: ResumeTemplateId): string {
  return TEMPLATE_LABELS[templateId];
}
