import { prepareCompanyExperienceInstructions } from './prepare-company-experience-instructions';

describe('prepareCompanyExperienceInstructions', () => {
  it('includes default prompt and mandatory rules', () => {
    const result = prepareCompanyExperienceInstructions({});
    expect(result).toContain('ATS-friendly');
    expect(result).toContain('MANDATORY OUTPUT RULES');
    expect(result).toContain('achievements');
  });

  it('appends user experience prompt and industry overlay', () => {
    const result = prepareCompanyExperienceInstructions({
      experiencePrompt: 'Emphasize platform ownership.',
      industryOverlay: 'Favor fintech language.',
    });
    expect(result).toContain('Emphasize platform ownership.');
    expect(result).toContain('Favor fintech language.');
    expect(result).toContain('INDUSTRY HINTS');
  });
});
