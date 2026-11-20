import {
  collectJdSkills,
  collectKeyModernBaselineSkills,
  mergeJdSkillsIntoCoreTechnologies,
  selectJdSkillsForRecency,
  planJdTechStackPerCompany,
} from './jd-skill-alignment';

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
