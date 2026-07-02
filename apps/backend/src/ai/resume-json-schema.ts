import {
  DEFAULT_RESUME_SETTINGS,
  MAX_EXPERIENCE_BULLETS_PER_ROLE,
  MAX_SKILL_CATEGORIES,
  MAX_SKILLS_PER_CATEGORY,
  type ResumeSettings,
  resolveResumeSettings,
} from './resume-settings';

export function buildResumeJsonSchema(
  settingsInput?: Partial<ResumeSettings> | null,
) {
  const settings = resolveResumeSettings(settingsInput ?? DEFAULT_RESUME_SETTINGS);
  const skillCategories = settings.skillCategories;
  const responsibilitiesMin = Math.min(
    settings.responsibilitiesCount,
    MAX_EXPERIENCE_BULLETS_PER_ROLE,
  );
  const achievementsMin = Math.min(
    settings.achievementsCount,
    Math.max(0, MAX_EXPERIENCE_BULLETS_PER_ROLE - responsibilitiesMin),
  );
  const skillsPerCategoryMax = Math.min(
    settings.skillsPerCategoryCount,
    MAX_SKILLS_PER_CATEGORY,
  );

  return {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
      },
      title: {
        type: 'string',
        minLength: 1,
      },
      contact: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            minLength: 1,
          },
          email: {
            type: 'string',
            minLength: 1,
          },
          phone: {
            type: 'string',
            minLength: 1,
          },
          linkedin: {
            type: 'string',
            minLength: 1,
          },
        },
        required: ['address', 'email', 'phone', 'linkedin'],
        additionalProperties: false,
      },
      summary: {
        type: 'string',
        minLength: 1,
      },
      skills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: skillCategories,
            },
            items: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: skillsPerCategoryMax,
            },
          },
          required: ['category', 'items'],
          additionalProperties: false,
        },
        minItems: 1,
        maxItems: MAX_SKILL_CATEGORIES,
      },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
            },
            company: {
              type: 'string',
              minLength: 1,
            },
            date_range: {
              type: 'string',
              minLength: 1,
            },
            job_type: {
              type: 'string',
              minLength: 1,
            },
            responsibilities: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: responsibilitiesMin,
              maxItems: MAX_EXPERIENCE_BULLETS_PER_ROLE,
            },
            achievements: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: achievementsMin,
              maxItems: MAX_EXPERIENCE_BULLETS_PER_ROLE,
            },
            skills: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: settings.companySkillsCount,
            },
          },
          required: [
            'title',
            'company',
            'date_range',
            'job_type',
            'responsibilities',
            'achievements',
            'skills',
          ],
          additionalProperties: false,
        },
        minItems: 1,
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            degree: {
              type: 'string',
              minLength: 1,
            },
            institution: {
              type: 'string',
              minLength: 1,
            },
            location: {
              type: 'string',
              minLength: 1,
            },
            date_range: {
              type: 'string',
              minLength: 1,
            },
          },
          required: ['degree', 'institution', 'location', 'date_range'],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: [
      'name',
      'title',
      'contact',
      'summary',
      'skills',
      'experience',
      'education',
    ],
    additionalProperties: false,
  };
}

export const RESUME_JSON_SCHEMA = buildResumeJsonSchema(DEFAULT_RESUME_SETTINGS);
