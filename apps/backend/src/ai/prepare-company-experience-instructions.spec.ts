import {
  prepareCompanyExperienceInstructions,
  stripCompanyNameFromBullets,
} from './prepare-company-experience-instructions';

describe('prepareCompanyExperienceInstructions', () => {
  it('includes default prompt and mandatory rules', () => {
    const result = prepareCompanyExperienceInstructions({});
    expect(result).toContain('ATS-friendly');
    expect(result).toContain('MANDATORY OUTPUT RULES');
    expect(result).toContain('achievements');
    expect(result).toContain('NEVER include the company name');
    expect(result).toContain('NEVER change the official job title');
    expect(result).toContain('Do not replace company experience with JD skills');
    expect(result).toContain('Most recent role: include the mandatory JD skills and the mandatory JD experience');
    expect(result).toContain('No gap-fill, no implied stacks, no weak evidence');
    expect(result).toContain('REQUIRED in exactly 1–2 bullets');
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

describe('stripCompanyNameFromBullets', () => {
  it('removes the employer name from bullets', () => {
    expect(
      stripCompanyNameFromBullets(
        [
          'At Zus Health, led clinical search rewrite improving reliability.',
          'Built APIs for patient data exchange across regions.',
        ],
        'Zus Health',
      ),
    ).toEqual([
      'Led clinical search rewrite improving reliability.',
      'Built APIs for patient data exchange across regions.',
    ]);
  });
});
