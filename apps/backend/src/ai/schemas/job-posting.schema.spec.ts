import { parseJobPostingResult } from './job-posting.schema';

const fallback = {
  companyName: 'Hint Co',
  roleType: 'Hint Title',
  jobDescription: 'Fallback description from the page.',
};

describe('parseJobPostingResult', () => {
  it('uses model fields when they are present', () => {
    expect(
      parseJobPostingResult(
        {
          companyName: 'Acme',
          roleType: 'Staff Engineer',
          jobDescription: 'Build APIs in TypeScript.',
        },
        fallback,
      ),
    ).toEqual({
      companyName: 'Acme',
      roleType: 'Staff Engineer',
      jobDescription: 'Build APIs in TypeScript.',
    });
  });

  it('falls back when model fields are blank', () => {
    expect(
      parseJobPostingResult(
        { companyName: '  ', roleType: '', jobDescription: '' },
        fallback,
      ),
    ).toEqual(fallback);
  });

  it('throws when neither the model nor the page has a description', () => {
    expect(() =>
      parseJobPostingResult(
        {},
        { companyName: 'Acme', roleType: 'Engineer', jobDescription: '' },
      ),
    ).toThrow(/job description/);
  });
});
