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

export function isValidTemplate(value: string): value is ResumeTemplateId {
  return (VALID_TEMPLATES as readonly string[]).includes(value);
}
