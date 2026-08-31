import { parseJdRequirementsResult } from './jd-requirements.schema';

describe('parseJdRequirementsResult', () => {
  it('parses model output and merges heuristic fallback', () => {
    const result = parseJdRequirementsResult(
      {
        languages: ['Go'],
        requiredSkills: ['Kubernetes'],
        experienceThemes: ['platform ownership'],
        experienceRequirements: ['5+ years distributed systems'],
      },
      'TypeScript React AWS required. 5+ years backend development.',
    );

    expect(result.languages).toEqual(
      expect.arrayContaining(['Go', 'TypeScript']),
    );
    expect(result.requiredSkills).toEqual(
      expect.arrayContaining(['Kubernetes', 'React', 'AWS']),
    );
    expect(result.experienceRequirements.length).toBeGreaterThan(0);
  });
});
