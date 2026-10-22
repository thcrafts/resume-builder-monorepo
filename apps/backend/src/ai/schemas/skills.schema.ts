import { categorizeJdSkill, resolveSkillCategory } from '@resume-builder/shared';
import { coerceToPlainText } from './experience.schema';

export function buildSkillsJsonSchema(options: {
  skillCategories: string[];
  skillsPerCategoryCount?: number;
  minSkillsPerCategory?: number;
}) {
  const perCategoryLimit =
    options.skillsPerCategoryCount && options.skillsPerCategoryCount > 0
      ? options.skillsPerCategoryCount
      : undefined;
  const perCategoryMin =
    perCategoryLimit && options.minSkillsPerCategory
      ? Math.min(options.minSkillsPerCategory, perCategoryLimit)
      : undefined;

  return {
    type: 'object',
    properties: {
      skills: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: options.skillCategories,
            },
            items: {
              type: 'array',
              ...(perCategoryMin ? { minItems: perCategoryMin } : { minItems: 1 }),
              ...(perCategoryLimit ? { maxItems: perCategoryLimit } : {}),
              items: { type: 'string', minLength: 1 },
            },
          },
          required: ['category', 'items'],
          additionalProperties: false,
        },
      },
    },
    required: ['skills'],
    additionalProperties: false,
  } as const;
}

export const skillsJsonSchema = buildSkillsJsonSchema({
  skillCategories: ['Languages'],
});

export interface SkillsResult {
  skills: Array<{ category: string; items: string[] }>;
}

function coerceSkillItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    const single = coerceToPlainText(value);
    return single ? [single] : [];
  }

  return value.map(coerceToPlainText).filter(Boolean);
}

function normalizeSkillEntry(
  entry: unknown,
): { category: string; items: string[] } | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const item = entry as Record<string, unknown>;
  const category = coerceToPlainText(
    item.category ?? item.name ?? item.label ?? item.group,
  );
  const items = coerceSkillItems(
    item.items ??
      item.skills ??
      item.technologies ??
      item.tools ??
      item.values,
  );

  if (!category || items.length === 0) {
    return null;
  }

  return { category, items };
}

function extractSkillsArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const direct =
    data.skills ??
    data.technicalSkills ??
    data.skillCategories ??
    data.categories;

  if (Array.isArray(direct)) {
    return direct;
  }

  // Shape: { skills: { Backend: ["Node"], Frontend: ["React"] } }
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return Object.entries(direct as Record<string, unknown>).map(
      ([category, items]) => ({ category, items }),
    );
  }

  // Shape: { Backend: ["Node"], Frontend: ["React"] } at top level
  const entries = Object.entries(data).filter(
    ([, value]) => Array.isArray(value) || typeof value === 'string',
  );
  if (entries.length > 0) {
    return entries.map(([category, items]) => ({ category, items }));
  }

  return null;
}

export function parseSkillsResult(raw: unknown): SkillsResult {
  const skillsRaw = extractSkillsArray(raw);
  if (!skillsRaw || skillsRaw.length === 0) {
    throw new Error('Invalid skills response');
  }

  const skills = skillsRaw
    .map(normalizeSkillEntry)
    .filter(
      (entry): entry is { category: string; items: string[] } => entry !== null,
    );

  if (skills.length === 0) {
    throw new Error('Invalid skills response');
  }

  return { skills };
}

/**
 * Build a usable skills section from profile/role sources when the model
 * returns an unusable payload.
 */
export function buildSkillsFallback(
  baselineSkills: Array<{ category: string; items: string[] }> | undefined,
  roleSkills: string[],
): Array<{ category: string; items: string[] }> {
  const fromBaseline = (baselineSkills ?? [])
    .map((entry) => ({
      category: String(entry.category ?? '').trim(),
      items: coerceSkillItems(entry.items),
    }))
    .filter((entry) => entry.category && entry.items.length > 0);

  const uniqueRoleSkills = coerceSkillItems(roleSkills);
  if (uniqueRoleSkills.length === 0) {
    return fromBaseline;
  }

  const next = fromBaseline.map((entry) => ({
    category: resolveSkillCategory(entry.category) ?? entry.category,
    items: [...entry.items],
  }));

  for (const skill of uniqueRoleSkills) {
    const category = categorizeJdSkill(skill);
    const existing = next.find((entry) => entry.category === category);
    if (existing) {
      if (!existing.items.includes(skill)) {
        existing.items.push(skill);
      }
    } else {
      next.push({ category, items: [skill] });
    }
  }

  return next;
}
