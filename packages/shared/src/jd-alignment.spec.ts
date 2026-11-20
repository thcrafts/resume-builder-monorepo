import {
  extractJdRequirementsHeuristic,
  mergeJdAlignment,
  buildExperienceAlignmentUserBlock,
} from './jd-alignment';

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

  it('keeps model mandatory skills and does not add heuristic extras', () => {
    const merged = mergeJdAlignment(
      {
        languages: ['Go'],
        requiredSkills: ['gRPC'],
        experienceThemes: ['platform ownership'],
      },
      'Must know TypeScript and React. Lead agile teams.',
    );

    expect(merged.languages).toEqual(['Go']);
    expect(merged.requiredSkills).toEqual(['gRPC']);
    expect(merged.languages).not.toContain('TypeScript');
    expect(merged.requiredSkills).not.toContain('React');
  });

  it('falls back to heuristic skills when the model returns none', () => {
    const merged = mergeJdAlignment(
      {
        languages: [],
        requiredSkills: [],
      },
      'Must know TypeScript and React.',
    );

    expect(merged.languages).toEqual(expect.arrayContaining(['TypeScript']));
    expect(merged.requiredSkills).toEqual(expect.arrayContaining(['React']));
  });

  it('requires assigned JD skills in most recent role bullets via company work', () => {
    const block = buildExperienceAlignmentUserBlock({
      alignment: {
        languages: ['Rust', 'TypeScript'],
        requiredSkills: ['React'],
        experienceThemes: ['scalability'],
        experienceRequirements: ['5+ years backend development'],
      },
      isMostRecent: true,
      recencyRank: 0,
      assignedJdSkills: ['Rust', 'TypeScript', 'React'],
      keyModernSkills: ['TypeScript', 'React', 'Next.js', 'Node.js'],
      jobDescriptionExcerpt: 'Build payment APIs.',
      company: {
        title: 'Senior Software Engineer',
        product: 'Payments platform',
        mission: 'Move money reliably',
      },
    });

    expect(block).toContain('STRONGEST (most recent role)');
    expect(block).toContain('do not retitle');
    expect(block).toContain('INCLUDE the mandatory JD skills');
    expect(block).toContain('mandatory JD experience');
    expect(block).toContain('modern skillsets');
    expect(block).toContain('5+ years backend development');
    expect(block).toContain('scalability');
    expect(block).toContain('main product');
    expect(block).toContain('Do not replace');
    expect(block).toContain('Next.js');
    expect(block).toContain('Node.js');
    expect(block).toContain('Senior Software Engineer');
    expect(block).toContain('Payments platform');
    expect(block).toContain('Rust');
    expect(block).toContain('TypeScript');
    expect(block).toContain('Build payment APIs.');
  });

  it('tapers JD skill expression for older roles', () => {
    const block = buildExperienceAlignmentUserBlock({
      alignment: {
        languages: ['Rust', 'TypeScript'],
        requiredSkills: ['React', 'AWS'],
        experienceThemes: [],
        experienceRequirements: [],
      },
      isMostRecent: false,
      recencyRank: 2,
      assignedJdSkills: ['TypeScript', 'React'],
      company: {
        title: 'Software Engineer',
        product: 'Lab portal',
        mission: 'Diagnostic data',
      },
    });

    expect(block).toContain('MODERATE (older role)');
    expect(block).toContain('weaker match');
    expect(block).toContain('modern/key stack');
    expect(block).toContain('Software Engineer');
    expect(block).not.toContain('Job description excerpt');
  });

  it('skips JD weave when the company title is ineligible', () => {
    const block = buildExperienceAlignmentUserBlock({
      alignment: {
        languages: ['Rust', 'TypeScript'],
        requiredSkills: ['React'],
        experienceThemes: ['scalability'],
        experienceRequirements: ['5+ years backend development'],
      },
      isMostRecent: true,
      recencyRank: 0,
      assignedJdSkills: ['Rust', 'TypeScript', 'React'],
      jdEligible: false,
      company: {
        title: 'UX Designer',
        product: 'Design system',
        mission: 'Improve usability',
      },
    });

    expect(block).toContain('TITLE MISMATCH');
    expect(block).toContain('Do NOT add mandatory JD skills');
    expect(block).toContain('none (title dissimilar to JD)');
    expect(block).toContain('UX Designer');
    expect(block).not.toContain('INCLUDE the mandatory JD skills');
  });
});
