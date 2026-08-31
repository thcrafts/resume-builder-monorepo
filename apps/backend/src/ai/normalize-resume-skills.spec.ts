import { DEFAULT_RESUME_SETTINGS } from '@resume-builder/shared';
import {
  enrichSkillsWithSources,
  normalizeGeneratedSkills,
} from './normalize-resume-skills';

describe('normalizeGeneratedSkills', () => {
  it('merges duplicate categories and dedupes items', () => {
    const result = normalizeGeneratedSkills(
      [
        { category: 'Backend', items: ['Node.js', 'node.js', 'Express'] },
        { category: 'Languages', items: ['TypeScript', 'JavaScript'] },
        { category: 'Databases', items: ['PostgreSQL'] },
      ],
      DEFAULT_RESUME_SETTINGS,
    );

    expect(result).toEqual([
      { category: 'Languages', items: ['TypeScript', 'JavaScript'] },
      { category: 'Backend', items: ['Node.js', 'Express'] },
      { category: 'Database', items: ['PostgreSQL'] },
    ]);
  });

  it('keeps all items when skillsPerCategoryCount is 0 (unlimited)', () => {
    const many = Array.from({ length: 15 }, (_, i) => `Skill${i + 1}`);
    const result = normalizeGeneratedSkills(
      [{ category: 'Backend', items: many }],
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Backend'],
        skillsPerCategoryCount: 0,
      },
    );

    expect(result[0]?.items).toHaveLength(15);
  });

  it('respects enabled categories and per-category limits', () => {
    const result = normalizeGeneratedSkills(
      [
        {
          category: 'Backend',
          items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
        },
        { category: 'Frontend', items: ['React'] },
        { category: 'Mobile', items: ['Flutter'] },
      ],
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Backend', 'Frontend'],
        skillsPerCategoryCount: 8,
      },
    );

    expect(result).toEqual([
      { category: 'Backend', items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
      { category: 'Frontend', items: ['React'] },
    ]);
  });
});

describe('enrichSkillsWithSources', () => {
  it('merges baseline and role skills into AI output', () => {
    const result = enrichSkillsWithSources(
      [{ category: 'Backend', items: ['Node.js'] }],
      {
        baselineSkills: [
          { category: 'Backend', items: ['Express', 'NestJS'] },
          { category: 'Languages', items: ['TypeScript'] },
        ],
        roleSkills: ['PostgreSQL', 'Redis'],
      },
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Languages', 'Backend', 'Tools'],
        skillsPerCategoryCount: 0,
      },
    );

    expect(result).toEqual(
      expect.arrayContaining([
        {
          category: 'Languages',
          items: ['TypeScript'],
        },
        {
          category: 'Backend',
          items: ['Node.js', 'Express', 'NestJS'],
        },
        {
          category: 'Tools',
          items: expect.arrayContaining(['PostgreSQL', 'Redis']),
        },
      ]),
    );
  });

  it('merges JD skills into core technologies when enabled', () => {
    const result = enrichSkillsWithSources(
      [{ category: 'Backend', items: ['Node.js'] }],
      {
        jdSkills: ['TypeScript', 'React', 'AWS'],
      },
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Languages', 'Frontend', 'Backend', 'Cloud & DevOps'],
        skillsPerCategoryCount: 10,
        includeJdSkillsInCoreTechnologies: true,
      },
    );

    expect(result).toEqual(
      expect.arrayContaining([
        { category: 'Languages', items: ['TypeScript'] },
        { category: 'Frontend', items: ['React'] },
        { category: 'Cloud & DevOps', items: ['AWS'] },
      ]),
    );
  });

  it('caps core technologies at skillsPerCategoryCount, prioritizing JD skills', () => {
    const result = enrichSkillsWithSources(
      [
        {
          category: 'Backend',
          items: [
            'Node.js',
            'Express',
            'NestJS',
            'Fastify',
            'Koa',
            'Hapi',
            'Restify',
            'Adonis',
            'Feathers',
            'LoopBack',
            'TypeORM',
          ],
        },
      ],
      {
        jdSkills: ['GraphQL'],
      },
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Backend'],
        skillsPerCategoryCount: 10,
        includeJdSkillsInCoreTechnologies: true,
      },
    );

    expect(result[0]?.items).toHaveLength(10);
    expect(result[0]?.items).toContain('GraphQL');
  });

  it('pads categories up to the minimum of 6 when enough source skills exist', () => {
    const result = enrichSkillsWithSources(
      [{ category: 'Backend', items: ['Node.js', 'Express'] }],
      {
        baselineSkills: [
          {
            category: 'Backend',
            items: ['NestJS', 'Fastify', 'Koa', 'Hapi', 'Restify'],
          },
        ],
      },
      {
        ...DEFAULT_RESUME_SETTINGS,
        skillCategories: ['Backend'],
        skillsPerCategoryCount: 10,
      },
    );

    expect(result[0]?.items.length).toBeGreaterThanOrEqual(6);
  });
});
