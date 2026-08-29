import {
  buildSkillsFallback,
  parseSkillsResult,
} from './skills.schema';

describe('parseSkillsResult', () => {
  it('accepts the standard skills array shape', () => {
    const result = parseSkillsResult({
      skills: [
        { category: 'Backend', items: ['Node.js', 'Express'] },
        { category: 'Languages', items: ['TypeScript'] },
      ],
    });

    expect(result.skills).toEqual([
      { category: 'Backend', items: ['Node.js', 'Express'] },
      { category: 'Languages', items: ['TypeScript'] },
    ]);
  });

  it('accepts a category map shape', () => {
    const result = parseSkillsResult({
      skills: {
        Backend: ['Node.js'],
        Frontend: ['React'],
      },
    });

    expect(result.skills).toEqual([
      { category: 'Backend', items: ['Node.js'] },
      { category: 'Frontend', items: ['React'] },
    ]);
  });

  it('coerces object-shaped skill items', () => {
    const result = parseSkillsResult({
      technicalSkills: [
        {
          name: 'Backend',
          technologies: [{ name: 'Node.js' }, 'NestJS'],
        },
      ],
    });

    expect(result.skills).toEqual([
      { category: 'Backend', items: ['Node.js', 'NestJS'] },
    ]);
  });

  it('throws when no usable skills are present', () => {
    expect(() => parseSkillsResult({ skills: [] })).toThrow(
      'Invalid skills response',
    );
  });
});

describe('buildSkillsFallback', () => {
  it('builds from baseline and role skills', () => {
    expect(
      buildSkillsFallback(
        [{ category: 'Languages', items: ['TypeScript'] }],
        ['AWS', 'Docker'],
      ),
    ).toEqual([
      { category: 'Languages', items: ['TypeScript'] },
      { category: 'Tools', items: ['AWS', 'Docker'] },
    ]);
  });
});
