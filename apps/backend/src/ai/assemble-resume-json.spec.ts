import { assembleResumeJson } from './assemble-resume-json';

describe('assembleResumeJson', () => {
  it('merges profile static fields with AI chunks', () => {
    const experienceByCompanyId = new Map([
      [
        'c1',
        {
          achievements: ['Built Acme Platform improving latency 40%.'],
          skills: ['TypeScript', 'Node.js'],
        },
      ],
      [
        'c2',
        {
          achievements: ['Shipped Beta Widget reducing costs 20%.'],
          skills: ['React'],
        },
      ],
    ]);

    const result = assembleResumeJson({
      name: 'Jane Doe',
      contacts: [
        {
          id: '1',
          email: 'jane@example.com',
          phone: '555-0100',
          address: 'Austin, TX',
          isPrimary: true,
        },
      ],
      candidateProfile: {
        professionalTitle: 'Senior Engineer',
        education: [
          {
            degree: 'BS CS',
            institution: 'State U',
            date_range: '2010 – 2014',
            location: 'TX',
          },
        ],
        certifications: [{ name: 'AWS SAA' }],
        baselineSkills: [],
      },
      companies: [
        {
          id: 'c1',
          company: 'Acme',
          title: 'Senior Engineer',
          date_range: '2022 – Present',
          job_type: 'Full-time',
          product: 'Acme Platform',
          mission: 'Reliable software',
          sortOrder: 1,
        },
        {
          id: 'c2',
          company: 'Beta',
          title: 'Engineer',
          date_range: '2018 – 2022',
          job_type: 'Full-time',
          product: 'Beta Widget',
          mission: 'Delight users',
          sortOrder: 0,
        },
      ],
      finalTitle: 'Senior Backend Engineer',
      summary: 'Senior engineer with platform experience.',
      skills: [{ category: 'Languages', items: ['TypeScript'] }],
      experienceByCompanyId,
    });

    expect(result.name).toBe('Jane Doe');
    expect(result.title).toBe('Senior Backend Engineer');
    expect(result.contact?.email).toBe('jane@example.com');
    expect(result.summary).toBe('Senior engineer with platform experience.');
    expect(result.education?.[0]?.degree).toBe('BS CS');
    expect(result.certifications).toEqual([{ name: 'AWS SAA' }]);
    expect(result.experience).toHaveLength(2);
    expect(result.experience?.[0]?.company).toBe('Acme');
    expect(result.experience?.[0]?.title).toBe('Senior Backend Engineer');
    expect(result.experience?.[0]?.achievements?.[0]).toContain('Acme Platform');
    expect(result.experience?.[0]?.responsibilities).toEqual([]);
    expect(result.experience?.[1]?.title).toBe('Engineer');
  });
});
