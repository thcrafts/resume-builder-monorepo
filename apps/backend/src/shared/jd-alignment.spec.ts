import {
  extractJdRequirementsHeuristic,
  mergeJdAlignment,
  buildExperienceAlignmentUserBlock,
} from '@resume-builder/shared';

describe('jd alignment', () => {
  it('extracts languages and skills from job description text', () => {
    const result = extractJdRequirementsHeuristic(`
      We need a Senior Engineer with TypeScript, React, Node.js, AWS, and Kubernetes.
      Experience with microservices and mentoring engineers is required.
    `);

    expect(result.languages).toEqual(
      expect.arrayContaining(['TypeScript']),
    );
    expect(result.requiredSkills).toEqual(
      expect.arrayContaining(['React', 'Node.js', 'AWS', 'Kubernetes']),
    );
    expect(result.experienceThemes).toEqual(
      expect.arrayContaining(['microservices', 'technical leadership']),
    );
  });

  it('merges model output with heuristic fallback', () => {
    const merged = mergeJdAlignment(
      {
        languages: ['Go'],
        requiredSkills: ['gRPC'],
        experienceThemes: ['platform ownership'],
      },
      'Must know TypeScript and React. Lead agile teams.',
    );

    expect(merged.languages).toEqual(
      expect.arrayContaining(['Go', 'TypeScript']),
    );
    expect(merged.requiredSkills).toEqual(
      expect.arrayContaining(['gRPC', 'React']),
    );
  });

  it('emphasizes mandatory alignment for most recent role', () => {
    const block = buildExperienceAlignmentUserBlock({
      alignment: {
        languages: ['TypeScript'],
        requiredSkills: ['React'],
        experienceThemes: ['scalability'],
        experienceRequirements: ['5+ years backend development'],
      },
      isMostRecent: true,
      jobDescriptionExcerpt: 'Build payment APIs.',
    });

    expect(block).toContain('MOST RECENT ROLE — mandatory');
    expect(block).toContain('TypeScript');
    expect(block).toContain('Build payment APIs.');
  });
});
