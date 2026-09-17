import { parseJdRequirementsResult } from './jd-requirements.schema';

describe('parseJdRequirementsResult', () => {
  it('parses model output and keeps mandatory skills from the model', () => {
    const result = parseJdRequirementsResult(
      {
        languages: ['Go'],
        requiredSkills: ['Kubernetes'],
        experienceThemes: ['platform ownership'],
        experienceRequirements: ['5+ years distributed systems'],
      },
      'TypeScript React AWS required. 5+ years backend development.',
    );

    expect(result.languages).toEqual(['Go']);
    expect(result.requiredSkills).toEqual(['Kubernetes']);
    expect(result.languages).not.toContain('TypeScript');
    expect(result.requiredSkills).not.toContain('React');
    expect(result.experienceRequirements.length).toBeGreaterThan(0);
  });
});
