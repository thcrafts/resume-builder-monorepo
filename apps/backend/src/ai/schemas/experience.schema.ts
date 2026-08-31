import { normalizeTechStackSkills } from '@resume-builder/shared';

export function buildExperienceJsonSchema(options?: {
  companySkillsCount?: number;
  achievementsCount?: number;
}) {
  const companySkillsCount = options?.companySkillsCount ?? 0;
  const achievementsCount =
    options?.achievementsCount && options.achievementsCount > 0
      ? options.achievementsCount
      : 6;

  return {
    type: 'object',
    properties: {
      achievements: {
        type: 'array',
        minItems: achievementsCount,
        maxItems: achievementsCount,
        items: { type: 'string', minLength: 40 },
      },
      skills: {
        type: 'array',
        items: { type: 'string', minLength: 1, maxLength: 40 },
        ...(companySkillsCount > 0
          ? {
              minItems: Math.min(companySkillsCount, 12),
              maxItems: Math.max(companySkillsCount, 12),
            }
          : {}),
      },
    },
    required: ['achievements', 'skills'],
    additionalProperties: false,
  } as const;
}

export const experienceJsonSchema = buildExperienceJsonSchema();

export interface ExperienceChunkResult {
  achievements: string[];
  skills: string[];
}

const BULLET_TEXT_KEYS = [
  'text',
  'bullet',
  'achievement',
  'description',
  'content',
  'value',
  'item',
  'summary',
  'name',
  'skill',
  'label',
] as const;

/**
 * Models sometimes return `{ "text": "..." }` instead of a plain string.
 * Coerce those into usable bullet/skill text.
 * Never stringify booleans/null — that produced bullets like "False." on PDFs.
 */
export function coerceToPlainText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  // Booleans must never become resume text ("false" → "False.")
  if (typeof value === 'boolean' || value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => coerceToPlainText(entry))
      .filter(Boolean)
      .join(', ')
      .trim();
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of BULLET_TEXT_KEYS) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    // Last resort: first non-empty string field on the object
    for (const candidate of Object.values(record)) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return '';
}

const INVALID_BULLET_TOKENS = /^(true|false|null|undefined|nan|\[object object\])\.?$/i;

/** Reject boolean leftovers and other non-sentence achievement items. */
export function isUsableExperienceBullet(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || INVALID_BULLET_TOKENS.test(trimmed)) {
    return false;
  }
  // Real achievement bullets are full sentences, not 1–2 token junk.
  return trimmed.split(/\s+/).filter(Boolean).length >= 6;
}

export function parseExperienceResult(raw: unknown): ExperienceChunkResult {
  const data = raw as Record<string, unknown>;
  const achievementsRaw = data.achievements ?? data.responsibilities;
  const skills = data.skills;

  const achievements = Array.isArray(achievementsRaw)
    ? achievementsRaw
        .map(coerceToPlainText)
        .filter((bullet) => isUsableExperienceBullet(bullet))
    : [];

  if (achievements.length === 0) {
    throw new Error('Invalid experience achievements response');
  }

  return {
    achievements,
    skills: normalizeTechStackSkills(
      Array.isArray(skills)
        ? skills
            .map(coerceToPlainText)
            .filter((skill) => skill && !INVALID_BULLET_TOKENS.test(skill))
        : [],
    ),
  };
}
