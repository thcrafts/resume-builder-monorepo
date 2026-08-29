export const summaryJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', minLength: 1 },
  },
  required: ['summary'],
  additionalProperties: false,
} as const;

export interface SummaryResult {
  summary: string;
}

export function parseSummaryResult(raw: unknown): SummaryResult {
  const data = raw as Record<string, unknown>;
  const summary = String(data.summary ?? '').trim();
  if (!summary) {
    throw new Error('Invalid summary response');
  }
  return { summary };
}
