import {
  collectJdSkills,
  collectKeyModernBaselineSkills,
  distributeJdSkillsAcrossExperience,
  mergeJdSkillsIntoCoreTechnologies,
  getUncoveredJdSkills,
  selectJdSkillsForRecency,
  planJdTechStackPerCompany,
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

describe('collectKeyModernBaselineSkills', () => {
  it('keeps languages, frameworks, and key technologies from the skill set', () => {
    const skills = collectKeyModernBaselineSkills([
      { category: 'Languages', items: ['TypeScript', 'Go'] },
      { category: 'Frontend', items: ['React', 'Next.js'] },
      { category: 'Backend', items: ['Node.js'] },
      { category: 'Industries', items: ['Healthcare'] },
      { category: 'Architecture', items: ['Agile'] },
    ]);

    expect(skills).toEqual(
      expect.arrayContaining(['TypeScript', 'Go', 'React', 'Next.js', 'Node.js']),
    );
    expect(skills).not.toContain('Healthcare');
    expect(skills).not.toContain('Agile');
  });

  it('falls back to unlabeled tech items when categories are custom', () => {
    expect(
      collectKeyModernBaselineSkills([
        { category: 'Programming', items: ['Rust', 'React'] },
      ]),
    ).toEqual(expect.arrayContaining(['Rust', 'React']));
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
    expect(
      getUncoveredJdSkills(['TypeScript', 'React', 'AWS'], result.flatMap((r) => r.skills)),
    ).toEqual([]);
  });

  it('normalizes AWS services when distributing JD skills', () => {
    const result = distributeJdSkillsAcrossExperience(
      [{ id: 'recent', skills: ['Node.js', 'EC2', 'RDS'] }],
      ['TypeScript', 'EC2', 'RDS'],
      10,
    );

    expect(result[0].skills).toContain('AWS');
    expect(result[0].skills).not.toContain('EC2');
    expect(result[0].skills).not.toContain('RDS');
  });
});

describe('selectJdSkillsForRecency', () => {
  const jdSkills = [
    'TypeScript',
    'React',
    'AWS',
    'PostgreSQL',
    'Kubernetes',
    'Kafka',
    'GraphQL',
    'Docker',
  ];

  it('assigns all JD skills to the most recent role', () => {
    const selected = selectJdSkillsForRecency(jdSkills, 0);
    expect(selected).toHaveLength(jdSkills.length);
    expect(selected).toEqual(expect.arrayContaining(jdSkills));
  });

  it('assigns fewer JD skills as roles get older', () => {
    const rng = () => 0.99;
    const previous = selectJdSkillsForRecency(jdSkills, 1, { rng });
    const older = selectJdSkillsForRecency(jdSkills, 2, {
      previousCount: previous.length,
      rng,
    });
    const earliest = selectJdSkillsForRecency(jdSkills, 3, {
      previousCount: older.length,
      rng,
    });

    expect(previous.length).toBeLessThan(jdSkills.length);
    expect(older.length).toBeLessThan(previous.length);
    expect(earliest.length).toBeLessThanOrEqual(older.length);
  });
});

describe('planJdTechStackPerCompany', () => {
  it('plans stronger skill lists for more recent companies', () => {
    const plan = planJdTechStackPerCompany(
      [{ id: 'recent' }, { id: 'mid' }, { id: 'old' }],
      ['TypeScript', 'React', 'AWS', 'PostgreSQL', 'Kubernetes', 'Kafka'],
      () => 0.99,
    );

    expect(plan.get('recent')?.length).toBe(6);
    expect(plan.get('mid')?.length).toBeLessThan(6);
    expect(plan.get('old')?.length).toBeLessThan(plan.get('mid')?.length ?? 0);
  });

  it('skips companies whose titles are dissimilar to the JD role', () => {
    const plan = planJdTechStackPerCompany(
      [
        { id: 'ux', title: 'UX Designer' },
        { id: 'swe', title: 'Software Engineer' },
        { id: 'fe', title: 'Frontend Engineer' },
      ],
      ['TypeScript', 'React', 'AWS', 'PostgreSQL', 'Kubernetes', 'Kafka'],
      { jdRoleTitle: 'Software Engineer', rng: () => 0.99 },
    );

    expect(plan.get('ux')).toEqual([]);
    expect(plan.get('swe')?.length).toBe(6);
    expect(plan.get('fe')?.length).toBeLessThan(6);
  });
});

describe('distributeJdSkillsAcrossExperience title gating', () => {
  it('does not force JD skills onto ineligible company ids', () => {
    const result = distributeJdSkillsAcrossExperience(
      [
        { id: 'ux', skills: ['Figma'] },
        { id: 'swe', skills: ['Node.js'] },
      ],
      ['TypeScript', 'React', 'AWS'],
      10,
      { eligibleIds: ['swe'] },
    );

    expect(result.find((entry) => entry.id === 'ux')?.skills).toEqual(['Figma']);
    expect(result.find((entry) => entry.id === 'swe')?.skills).toEqual(
      expect.arrayContaining(['TypeScript', 'React', 'AWS', 'Node.js']),
    );
  });
});

describe('mergeJdSkillsIntoCoreTechnologies', () => {
  it('adds JD skills into enabled categories', () => {
    const result = mergeJdSkillsIntoCoreTechnologies(
      [{ category: 'Backend', items: ['Node.js'] }],
      ['TypeScript', 'React', 'AWS'],
      ['Languages', 'Frontend', 'Backend', 'Cloud & DevOps'],
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

  it('routes JD skills into AI, Data & Messaging, Architecture, and Industries', () => {
    const result = mergeJdSkillsIntoCoreTechnologies(
      [{ category: 'Databases', items: ['MySQL'] }],
      ['LangChain', 'Kafka', 'PostgreSQL', 'Microservices', 'Healthcare'],
      ['AI', 'Data & Messaging', 'Architecture', 'Industries'],
    );

    expect(result).toEqual([
      { category: 'AI', items: ['LangChain'] },
      { category: 'Data & Messaging', items: ['MySQL', 'Kafka', 'PostgreSQL'] },
      { category: 'Architecture', items: ['Microservices'] },
      { category: 'Industries', items: ['Healthcare'] },
    ]);
  });
});
