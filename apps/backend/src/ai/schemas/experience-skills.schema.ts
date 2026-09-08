import { coerceToPlainText } from './experience.schema';

export const experienceSkillsJsonSchema = {
  type: 'object',
  properties: {
    skills: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1, maxLength: 40 },
    },
  },
  required: ['skills'],
  additionalProperties: false,
} as const;

export interface ExperienceSkillsResult {
  skills: string[];
}

export function parseExperienceSkillsResult(raw: unknown): ExperienceSkillsResult {
  const data = raw as Record<string, unknown>;
  const skillsRaw = data.skills;

  if (!Array.isArray(skillsRaw)) {
    throw new Error('Invalid experience skills response');
  }

  const skills = skillsRaw
    .map(coerceToPlainText)
    .filter((skill) => skill.length > 0);

  if (skills.length === 0) {
    throw new Error('Invalid experience skills response');
  }

  return { skills };
}
