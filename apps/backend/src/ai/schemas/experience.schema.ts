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
 */
export function coerceToPlainText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => coerceToPlainText(entry))
      .filter(Boolean)
      .join(', ')
      .trim();
  }

  if (value && typeof value === 'object') {
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

export function parseExperienceResult(raw: unknown): ExperienceChunkResult {
  const data = raw as Record<string, unknown>;
  const achievementsRaw = data.achievements ?? data.responsibilities;
  const skills = data.skills;

  const achievements = Array.isArray(achievementsRaw)
    ? achievementsRaw.map(coerceToPlainText).filter(Boolean)
    : [];

  if (achievements.length === 0) {
    throw new Error('Invalid experience achievements response');
  }

  return {
    achievements,
    skills: Array.isArray(skills)
      ? skills.map(coerceToPlainText).filter(Boolean)
      : [],
  };
}

function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function alignExperienceResultWithJd(
  result: ExperienceChunkResult,
  options: {
    isMostRecent: boolean;
    languages: string[];
    requiredSkills: string[];
    companySkillsCount?: number;
  },
): ExperienceChunkResult {
  if (!options.isMostRecent) {
    return result;
  }

  let skills = dedupeSkills([
    ...result.skills,
    ...options.languages,
    ...options.requiredSkills.slice(0, 6),
  ]);

  if (options.companySkillsCount && options.companySkillsCount > 0) {
    skills = skills.slice(0, options.companySkillsCount);
  }

  return {
    ...result,
    skills,
  };
}
