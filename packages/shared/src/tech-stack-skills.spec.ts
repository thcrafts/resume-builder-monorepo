import {
  normalizeTechStackSkills,
  isNonTechStackSkill,
  techStackSkillsMatch,
} from './tech-stack-skills';

describe('normalizeTechStackSkills', () => {
  it('removes compliance and design-practice phrases', () => {
    expect(
      normalizeTechStackSkills([
        'TypeScript',
        'HIPAA compliance',
        'SOC 2 compliance',
        'relational database design',
        'query optimization',
        'React',
      ]),
    ).toEqual(['TypeScript', 'React']);
  });

  it('matches the problematic resume skill list from user report', () => {
    expect(
      normalizeTechStackSkills([
        'Ruby',
        'JavaScript',
        'Dart',
        'Go',
        'Ruby on Rails',
        'React',
        'Flutter',
        'relational database design',
        'query optimization',
        'HIPAA compliance',
        'SOC 2 compliance',
        'AWS',
        'ECS',
        'RDS',
        'S3',
        'Git',
        'Java',
      ]),
    ).toEqual([
      'Ruby',
      'JavaScript',
      'Dart',
      'Go',
      'Ruby on Rails',
      'React',
      'Flutter',
      'Git',
      'Java',
      'AWS',
    ]);
  });

  it('collapses AWS services to AWS', () => {
    expect(
      normalizeTechStackSkills(['EC2', 'RDS', 'TypeScript', 'AWS S3']),
    ).toEqual(['TypeScript', 'AWS']);
  });

  it('treats EC2 as covered by AWS', () => {
    expect(techStackSkillsMatch('EC2', 'AWS')).toBe(true);
    expect(techStackSkillsMatch('RDS', 'AWS')).toBe(true);
  });

  it('flags vague category phrases', () => {
    expect(isNonTechStackSkill('event-based frameworks')).toBe(true);
    expect(isNonTechStackSkill('Kafka')).toBe(false);
  });
});
