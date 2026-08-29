export const titleMatchJsonSchema = {
  type: 'object',
  properties: {
    rootTitle: { type: 'string', minLength: 1 },
    similarity: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['rootTitle', 'similarity'],
  additionalProperties: false,
} as const;

export interface TitleMatchResult {
  rootTitle: string;
  similarity: number;
}

export function parseTitleMatchResult(raw: unknown): TitleMatchResult {
  const data = raw as Record<string, unknown>;
  const rootTitle = String(data.rootTitle ?? '').trim();
  const similarity = Number(data.similarity);

  if (!rootTitle || !Number.isFinite(similarity)) {
    throw new Error('Invalid title match response');
  }

  return {
    rootTitle,
    similarity: Math.min(1, Math.max(0, similarity)),
  };
}

export function resolveFinalTitle(
  professionalTitle: string,
  match: TitleMatchResult,
  threshold = 0.8,
): string {
  if (match.similarity >= threshold && professionalTitle.trim()) {
    return professionalTitle.trim();
  }
  return match.rootTitle;
}
