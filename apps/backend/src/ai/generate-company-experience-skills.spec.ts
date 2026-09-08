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
    expect(prompt).toContain('extract technologies from the achievement bullets');
    expect(prompt).toContain('Target skill count: about 8');
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
});
