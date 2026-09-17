import {
  buildExperienceSkillsUserPrompt,
  buildEvidenceBasedSkillsFallback,
  filterSkillsEvidentInAchievements,
  finalizeCompanyExperienceSkills,
  isSkillEvidentInText,
} from './generate-company-experience-skills';

const sampleCompany = {
  id: '1',
  company: 'Acme',
  title: 'Senior Engineer',
  date_range: '2020 - Present',
  job_type: 'Full-time',
  location: 'Remote',
  product: 'Payments',
  mission: 'Move money',
  context: '',
  order: 0,
};

const sampleAchievements = [
  'Built event-driven payment pipelines using Kafka and TypeScript.',
  'Deployed services on AWS EC2 with PostgreSQL for transaction storage.',
];

describe('isSkillEvidentInText', () => {
  it('matches explicit technology names in bullets', () => {
    expect(
      isSkillEvidentInText('Kafka', sampleAchievements[0]),
    ).toBe(true);
    expect(
      isSkillEvidentInText('Kubernetes', sampleAchievements[0]),
    ).toBe(false);
  });

  it('matches AWS family skills mentioned as services', () => {
    expect(
      isSkillEvidentInText('AWS', sampleAchievements[1]),
    ).toBe(true);
  });
});

describe('filterSkillsEvidentInAchievements', () => {
  it('drops JD skills not mentioned in bullets', () => {
    expect(
      filterSkillsEvidentInAchievements(
        ['TypeScript', 'Kafka', 'React', 'Kubernetes'],
        sampleAchievements,
      ),
    ).toEqual(['TypeScript', 'Kafka']);
  });

  it('drops vague category skills even when model returns them', () => {
    expect(
      finalizeCompanyExperienceSkills(
        ['event-based frameworks', 'HIPAA compliance', 'EC2', 'TypeScript'],
        sampleAchievements,
        0,
      ),
    ).toEqual(['TypeScript', 'AWS']);
  });
});

describe('buildExperienceSkillsUserPrompt', () => {
  it('includes achievements and evidence-only guidance', () => {
    const prompt = buildExperienceSkillsUserPrompt({
      company: sampleCompany,
      achievements: sampleAchievements,
      companySkillsCount: 8,
      isMostRecent: true,
    });

    expect(prompt).toContain('Acme');
    expect(prompt).toContain('Kafka');
    expect(prompt).not.toContain('Mandatory JD skills');
    expect(prompt).toContain('start from technologies in the achievement bullets');
    expect(prompt).toContain('Target skill count: about 8');
  });

  it('asks to keep key/modern skills and add mandatory JD skills', () => {
    const prompt = buildExperienceSkillsUserPrompt({
      company: sampleCompany,
      achievements: sampleAchievements,
      companySkillsCount: 8,
      isMostRecent: true,
      keyModernSkills: ['React', 'Next.js', 'TypeScript'],
      assignedJdSkills: ['Kafka', 'Go'],
    });

    expect(prompt).toContain('React');
    expect(prompt).toContain('Next.js');
    expect(prompt).toContain('Mandatory JD skills to ADD');
    expect(prompt).toContain('do not replace');
    expect(prompt).toContain('Go');
  });
});

describe('finalizeCompanyExperienceSkills', () => {
  it('trims evidenced skills to count', () => {
    expect(
      finalizeCompanyExperienceSkills(
        ['TypeScript', 'Kafka', 'PostgreSQL', 'AWS', 'Docker'],
        sampleAchievements,
        3,
      ),
    ).toEqual(['TypeScript', 'Kafka', 'PostgreSQL']);
  });

  it('keeps key/modern skills and adds mandatory JD skills instead of replacing', () => {
    const skills = finalizeCompanyExperienceSkills(
      ['TypeScript'],
      sampleAchievements,
      8,
      {
        keyModernSkills: ['React', 'Next.js', 'TypeScript'],
        mandatoryJdSkills: ['Kafka', 'Go'],
      },
    );

    expect(skills).toEqual(
      expect.arrayContaining(['TypeScript', 'React', 'Next.js', 'Kafka', 'Go']),
    );
    expect(skills[0]).toBe('TypeScript');
    expect(skills.indexOf('React')).toBeLessThan(skills.indexOf('Go'));
  });

  it('does not let JD-only bullets wipe modern frameworks when trimming', () => {
    const skills = finalizeCompanyExperienceSkills(
      ['Rust', 'TypeScript', 'React', 'Kafka', 'Go', 'Kubernetes'],
      [
        'Built pipelines using Rust, TypeScript, React, Kafka, Go, and Kubernetes.',
      ],
      8,
      {
        keyModernSkills: ['Next.js', 'Node.js', 'TypeScript'],
        mandatoryJdSkills: ['Rust', 'Go'],
      },
    );

    expect(skills).toEqual(expect.arrayContaining(['Next.js', 'Node.js', 'TypeScript']));
  });
});

describe('buildEvidenceBasedSkillsFallback', () => {
  it('only keeps JD candidates evidenced in bullets', () => {
    expect(
      buildEvidenceBasedSkillsFallback(
        sampleAchievements,
        {
          languages: ['TypeScript', 'Go'],
          requiredSkills: ['Kafka', 'React', 'Kubernetes'],
          experienceThemes: [],
          experienceRequirements: [],
        },
        10,
      ),
    ).toEqual(['TypeScript', 'Kafka']);
  });

  it('adds key/modern skills and mandatory JD skills on fallback', () => {
    const skills = buildEvidenceBasedSkillsFallback(
      sampleAchievements,
      {
        languages: ['TypeScript', 'Go'],
        requiredSkills: ['Kafka', 'React', 'Kubernetes'],
        experienceThemes: [],
        experienceRequirements: [],
      },
      10,
      {
        keyModernSkills: ['Next.js', 'TypeScript'],
        mandatoryJdSkills: ['Go'],
      },
    );

    expect(skills).toEqual(
      expect.arrayContaining(['TypeScript', 'Kafka', 'Next.js', 'Go']),
    );
  });
});
