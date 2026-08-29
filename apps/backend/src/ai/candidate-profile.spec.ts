import {
  validateCandidateProfile,
  TITLE_SIMILARITY_THRESHOLD,
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
