import { buildSummaryChunkUserPrompt } from './generate-summary-prompt';

describe('buildSummaryChunkUserPrompt', () => {
  it('includes mandatory JD skills, experience, and modern skillsets', () => {
    const prompt = buildSummaryChunkUserPrompt({
      jobContext: 'Need TypeScript',
      finalTitle: 'Senior Software Engineer',
      companySummaries: ['Acme: Payments'],
      yearsOfExperience: 8,
      mandatorySkills: ['TypeScript', 'React', 'AWS'],
      keyModernSkills: ['Next.js', 'Node.js'],
      mandatoryExperience: ['5+ years backend development', 'scalability'],
    });

    expect(prompt).toContain('100–120 words');
    expect(prompt).toContain('8+ years of experience');
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('React');
    expect(prompt).toContain('AWS');
    expect(prompt).toContain('Next.js');
    expect(prompt).toContain('5+ years backend development');
    expect(prompt).toContain('scalability');
    expect(prompt).toContain('ADD with modern skillsets');
  });

  it('omits optional blocks when they are empty', () => {
    const prompt = buildSummaryChunkUserPrompt({
      jobContext: 'Need TypeScript',
      finalTitle: 'Engineer',
      companySummaries: ['Acme: Payments'],
    });

    expect(prompt).not.toContain('Mandatory JD skills');
    expect(prompt).not.toContain('Mandatory JD experience');
    expect(prompt).not.toContain('Candidate modern skillsets');
    expect(prompt).not.toContain('Years of experience');
  });
});
