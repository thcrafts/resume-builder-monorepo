import {
  mergeJdAlignment,
  type JdAlignmentRequirements,
} from '@resume-builder/shared';

export const jdRequirementsJsonSchema = {
  type: 'object',
  properties: {
    languages: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    requiredSkills: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    experienceThemes: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    experienceRequirements: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
  required: [
    'languages',
    'requiredSkills',
    'experienceThemes',
    'experienceRequirements',
  ],
  additionalProperties: false,
} as const;

export function parseJdRequirementsResult(
  raw: unknown,
  jobDescription = '',
): JdAlignmentRequirements {
  const data = raw as Record<string, unknown>;

  return mergeJdAlignment(
    {
      languages: Array.isArray(data.languages)
        ? data.languages.map((item) => String(item))
        : [],
      requiredSkills: Array.isArray(data.requiredSkills)
        ? data.requiredSkills.map((item) => String(item))
        : [],
      experienceThemes: Array.isArray(data.experienceThemes)
        ? data.experienceThemes.map((item) => String(item))
        : [],
      experienceRequirements: Array.isArray(data.experienceRequirements)
        ? data.experienceRequirements.map((item) => String(item))
        : [],
    },
    jobDescription,
  );
}
