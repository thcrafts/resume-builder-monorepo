import {
  collectJdSkills,
  distributeJdSkillsAcrossExperience,
  mergeJdSkillsIntoCoreTechnologies,
  getUncoveredJdSkills,
} from '@resume-builder/shared';

describe('collectJdSkills', () => {
  it('merges languages and required skills', () => {
    expect(
      collectJdSkills({
        languages: ['TypeScript', 'Python'],
        requiredSkills: ['React', 'AWS'],
        experienceThemes: [],
        experienceRequirements: [],
      }),
    ).toEqual(['TypeScript', 'Python', 'React', 'AWS']);
  });
});

describe('distributeJdSkillsAcrossExperience', () => {
  const jdSkills = ['TypeScript', 'React', 'AWS', 'PostgreSQL', 'Kubernetes'];

  it('puts all JD skills on the most recent company', () => {
    const result = distributeJdSkillsAcrossExperience(
      [
        { id: 'recent', skills: ['Node.js'] },
        { id: 'older', skills: ['Java'] },
      ],
      jdSkills,
      10,
    );

    for (const skill of jdSkills) {
      expect(result[0].skills.join(' ')).toContain(skill);
    }
  });

  it('covers all JD skills across the union of companies', () => {
    const result = distributeJdSkillsAcrossExperience(
      [
        { id: 'recent', skills: ['Node.js'] },
        { id: 'older-a', skills: ['Java'] },
        { id: 'older-b', skills: ['Spring'] },
      ],
      jdSkills,
      10,
    );

    const union = result.flatMap((entry) => entry.skills);
    expect(getUncoveredJdSkills(jdSkills, union)).toEqual([]);
  });

  it('distributes missing JD skills to older companies', () => {
    const result = distributeJdSkillsAcrossExperience(
      [
        { id: 'recent', skills: ['TypeScript'] },
        { id: 'older', skills: ['Java'] },
      ],
      ['TypeScript', 'React', 'AWS'],
      10,
    );

    expect(result[0].skills).toEqual(
      expect.arrayContaining(['TypeScript', 'React', 'AWS']),
    );
    expect(getUncoveredJdSkills(jdSkills.slice(0, 3), result.flatMap((r) => r.skills))).toEqual([]);
  });
});

describe('mergeJdSkillsIntoCoreTechnologies', () => {
  it('adds JD skills into enabled categories', () => {
    const result = mergeJdSkillsIntoCoreTechnologies(
      [{ category: 'Backend', items: ['Node.js'] }],
      ['TypeScript', 'React', 'AWS'],
      ['Languages', 'Frontend', 'Backend', 'Cloud & DevOps', 'Tools'],
    );

    expect(result).toEqual(
      expect.arrayContaining([
        { category: 'Languages', items: ['TypeScript'] },
        { category: 'Frontend', items: ['React'] },
        { category: 'Backend', items: ['Node.js'] },
        { category: 'Cloud & DevOps', items: ['AWS'] },
      ]),
    );
  });
});
