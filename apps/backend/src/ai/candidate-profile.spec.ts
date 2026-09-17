import {
  validateCandidateProfile,
  TITLE_SIMILARITY_THRESHOLD,
  parseGraduationYearFromDateRange,
  computeYearsOfExperienceFromEducation,
  applySummaryExperienceYears,
  clampSummaryLength,
  SUMMARY_MAX_WORDS,
} from '@resume-builder/shared';

describe('validateCandidateProfile', () => {
  const validProfile = {
    name: 'Jane Doe',
    contacts: [
      {
        id: '1',
        email: 'jane@example.com',
        isPrimary: true,
      },
    ],
    candidateProfile: {
      professionalTitle: 'Senior Software Engineer',
      education: [
        {
          degree: 'BS CS',
          institution: 'State U',
          date_range: '2010 – 2014',
        },
      ],
      certifications: [],
      baselineSkills: [
        { category: 'Languages', items: ['TypeScript', 'Python'] },
      ],
    },
    companies: [
      {
        id: 'c1',
        company: 'Acme',
        title: 'Senior Software Engineer',
        date_range: '2020 – Present',
        job_type: 'Full-time',
        product: 'Acme Platform',
        mission: 'Build reliable software',
        sortOrder: 0,
      },
    ],
  };

  it('accepts a complete profile', () => {
    const result = validateCandidateProfile(validProfile);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires exactly one primary contact with email', () => {
    const result = validateCandidateProfile({
      ...validProfile,
      contacts: [
        { id: '1', email: 'a@x.com', isPrimary: true },
        { id: '2', email: 'b@x.com', isPrimary: true },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('primary'))).toBe(true);
  });

  it('requires product and mission on companies', () => {
    const result = validateCandidateProfile({
      ...validProfile,
      companies: [
        {
          ...validProfile.companies[0],
          product: '',
          mission: '',
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('product'))).toBe(true);
    expect(result.errors.some((e) => e.includes('mission'))).toBe(true);
  });

  it('requires baseline skills with items', () => {
    const result = validateCandidateProfile({
      ...validProfile,
      candidateProfile: {
        ...validProfile.candidateProfile,
        baselineSkills: [{ category: 'Languages', items: [] }],
      },
    });
    expect(result.valid).toBe(false);
  });

  it('exports title similarity threshold of 0.8', () => {
    expect(TITLE_SIMILARITY_THRESHOLD).toBe(0.8);
  });
});

describe('parseGraduationYearFromDateRange', () => {
  it('parses end year from a range', () => {
    expect(parseGraduationYearFromDateRange('2010 – 2014')).toBe(2014);
    expect(parseGraduationYearFromDateRange('2015 - 2019')).toBe(2019);
  });

  it('parses a single graduation date', () => {
    expect(parseGraduationYearFromDateRange('05/2019')).toBe(2019);
    expect(parseGraduationYearFromDateRange('May 2019')).toBe(2019);
    expect(parseGraduationYearFromDateRange('2019')).toBe(2019);
  });

  it('returns null for empty or unparseable values', () => {
    expect(parseGraduationYearFromDateRange('')).toBeNull();
    expect(parseGraduationYearFromDateRange('Present')).toBeNull();
  });
});

describe('computeYearsOfExperienceFromEducation', () => {
  const referenceDate = new Date('2026-08-30');

  it('computes years from earliest graduation year', () => {
    const years = computeYearsOfExperienceFromEducation(
      [
        { degree: 'BS', institution: 'A', date_range: '2010 – 2014' },
        { degree: 'MS', institution: 'B', date_range: '2014 – 2016' },
      ],
      referenceDate,
    );
    expect(years).toBe(12);
  });

  it('returns null when no graduation year can be parsed', () => {
    expect(
      computeYearsOfExperienceFromEducation(
        [{ degree: 'BS', institution: 'A', date_range: 'TBD' }],
        referenceDate,
      ),
    ).toBeNull();
  });
});

describe('applySummaryExperienceYears', () => {
  it('replaces an incorrect years phrase', () => {
    const summary =
      'Senior Engineer with 5+ years of experience building distributed systems.';
    expect(applySummaryExperienceYears(summary, 12)).toBe(
      'Senior Engineer with 12+ years of experience building distributed systems.',
    );
  });

  it('leaves summary unchanged when years phrase is missing', () => {
    const summary = 'Senior Engineer building distributed systems.';
    expect(applySummaryExperienceYears(summary, 12)).toBe(summary);
  });
});

describe('clampSummaryLength', () => {
  const filler = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ');

  it('keeps a short summary unchanged', () => {
    const summary =
      'Senior Engineer with 12+ years of experience building payments in TypeScript.';
    expect(clampSummaryLength(summary)).toBe(summary);
  });

  it('does not split on abbreviations like Node.js', () => {
    const summary =
      'Built APIs in Node.js. Led the checkout rewrite in TypeScript.';
    expect(clampSummaryLength(summary)).toBe(summary);
  });

  it('drops extra sentences once the word cap is reached', () => {
    const first = `Senior Engineer with 12+ years of experience ${filler(40, 'a')}.`;
    const second = `${filler(40, 'b')}.`;
    const third = `${filler(40, 'c')}.`;
    const clamped = clampSummaryLength(`${first} ${second} ${third}`);

    expect(clamped).toContain('a0');
    expect(clamped).toContain('b0');
    expect(clamped).not.toContain('c0');
    expect(clamped.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(
      SUMMARY_MAX_WORDS,
    );
  });

  it('hard-cuts a single oversized sentence', () => {
    const clamped = clampSummaryLength(`${filler(160, 'word')}.`);
    expect(clamped.split(/\s+/).filter(Boolean)).toHaveLength(SUMMARY_MAX_WORDS);
    expect(clamped.endsWith('.')).toBe(true);
  });
});
