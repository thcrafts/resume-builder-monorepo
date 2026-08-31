import type { JdAlignmentRequirements } from './jd-alignment';
import {
  SKILL_CATEGORIES,
  type SkillCategory,
} from './resume-settings';
import {
  normalizeTechStackSkills,
  techStackSkillsMatch,
  isNonTechStackSkill,
} from './tech-stack-skills';

export interface CompanyExperienceSkills {
  id: string;
  skills: string[];
}

export function dedupeSkillsCaseInsensitive(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

/** All technical skills extracted from JD alignment (languages + frameworks/tools). */
export function collectJdSkills(alignment: JdAlignmentRequirements): string[] {
  return dedupeSkillsCaseInsensitive([
    ...alignment.languages,
    ...alignment.requiredSkills,
  ]);
}

/** JD skills filtered to concrete tech stacks (no compliance/themes; AWS not EC2/RDS). */
export function collectJdTechStackSkills(
  alignment: JdAlignmentRequirements,
): string[] {
  return normalizeTechStackSkills(collectJdSkills(alignment));
}

export function isSkillCovered(skill: string, skills: string[]): boolean {
  const key = skill.trim().toLowerCase();
  if (!key) {
    return false;
  }

  return skills.some((candidate) => techStackSkillsMatch(skill, candidate));
}

export function getUncoveredJdSkills(
  jdSkills: string[],
  unionSkills: string[],
): string[] {
  return jdSkills.filter((jd) => !isSkillCovered(jd, unionSkills));
}

function trimSkillsPreservingRequired(
  skills: string[],
  required: string[],
  maxCount: number,
): string[] {
  if (maxCount <= 0) {
    return dedupeSkillsCaseInsensitive(skills);
  }

  const requiredFound = skills.filter((skill) => isSkillCovered(skill, required));
  const others = skills.filter((skill) => !isSkillCovered(skill, required));
  const limit = Math.max(maxCount, requiredFound.length);

  return dedupeSkillsCaseInsensitive([...requiredFound, ...others]).slice(
    0,
    limit,
  );
}

/**
 * Ensures JD skills appear across company experience entries:
 * - Most recent role: ALL JD skills
 * - Older roles: partial JD skills so the union covers every JD skill
 */
export function distributeJdSkillsAcrossExperience(
  companies: CompanyExperienceSkills[],
  jdSkills: string[],
  companySkillsCount: number,
): CompanyExperienceSkills[] {
  if (companies.length === 0) {
    return companies;
  }

  const jdSkillSet = dedupeSkillsCaseInsensitive(
    normalizeTechStackSkills(jdSkills),
  );
  const result = companies.map((company) => ({
    id: company.id,
    skills: normalizeTechStackSkills(company.skills),
  }));

  if (jdSkillSet.length === 0) {
    if (companySkillsCount <= 0) {
      return result;
    }
    return result.map((company) => ({
      ...company,
      skills: company.skills.slice(0, companySkillsCount),
    }));
  }

  const unionAll = () => result.flatMap((company) => company.skills);

  // Most recent company must include every JD skill.
  result[0].skills = dedupeSkillsCaseInsensitive([
    ...jdSkillSet,
    ...result[0].skills,
  ]);

  let missing = getUncoveredJdSkills(jdSkillSet, unionAll());
  const olderCompanies = result.slice(1);

  if (olderCompanies.length > 0) {
    missing.forEach((skill, index) => {
      const target = olderCompanies[index % olderCompanies.length];
      if (!isSkillCovered(skill, target.skills)) {
        target.skills = dedupeSkillsCaseInsensitive([...target.skills, skill]);
      }
    });
  }

  missing = getUncoveredJdSkills(jdSkillSet, unionAll());
  if (missing.length > 0) {
    result[0].skills = dedupeSkillsCaseInsensitive([
      ...result[0].skills,
      ...missing,
    ]);
  }

  if (companySkillsCount <= 0) {
    return result;
  }

  const protectedJdByCompany = new Map<string, string[]>();
  protectedJdByCompany.set(result[0].id, jdSkillSet);

  for (const company of olderCompanies) {
    protectedJdByCompany.set(
      company.id,
      jdSkillSet.filter((jd) => isSkillCovered(jd, company.skills)),
    );
  }

  return result.map((company, index) => {
    const protectedJd = protectedJdByCompany.get(company.id) ?? [];
    const minCount =
      index === 0
        ? Math.max(companySkillsCount, jdSkillSet.length)
        : companySkillsCount;

    return {
      id: company.id,
      skills: normalizeTechStackSkills(
        trimSkillsPreservingRequired(company.skills, protectedJd, minCount),
      ),
    };
  });
}

/** Pre-assign JD tech-stack skills per company before AI generation. */
export function planJdTechStackPerCompany(
  companies: Array<{ id: string }>,
  jdSkills: string[],
): Map<string, string[]> {
  const techSkills = normalizeTechStackSkills(jdSkills);
  const plan = new Map<string, string[]>();

  if (companies.length === 0 || techSkills.length === 0) {
    return plan;
  }

  plan.set(companies[0].id, [...techSkills]);

  const older = companies.slice(1);
  older.forEach((company, index) => {
    const subset = techSkills.filter((_, skillIndex) => {
      if (older.length === 0) {
        return false;
      }
      return skillIndex % older.length === index;
    });
    plan.set(company.id, subset.length > 0 ? subset : techSkills.slice(0, 3));
  });

  return plan;
}

export { isNonTechStackSkill };

const LANGUAGE_TERMS = new Set(
  [
    'typescript',
    'javascript',
    'python',
    'java',
    'go',
    'golang',
    'c#',
    'c++',
    'ruby',
    'php',
    'swift',
    'kotlin',
    'rust',
    'scala',
    'sql',
    'html',
    'css',
  ].map((term) => term.toLowerCase()),
);

const FRONTEND_TERMS = [
  'react',
  'angular',
  'vue',
  'next.js',
  'nextjs',
  'svelte',
  'tailwind',
  'redux',
  'webpack',
  'vite',
];

const BACKEND_TERMS = [
  'node.js',
  'nodejs',
  'nestjs',
  'express',
  'django',
  'fastapi',
  'spring',
  'flask',
  'rails',
  'laravel',
  '.net',
  'graphql',
  'rest',
  'microservices',
  'kafka',
];

const CLOUD_TERMS = [
  'aws',
  'azure',
  'gcp',
  'kubernetes',
  'docker',
  'terraform',
  'ci/cd',
  'devops',
  'linux',
  'git',
];

const DATABASE_TERMS = [
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'dynamodb',
  'elasticsearch',
  'cassandra',
  'sqlite',
  'oracle',
];

const AI_TERMS = [
  'machine learning',
  'llm',
  'openai',
  'tensorflow',
  'pytorch',
  'langchain',
  'rag',
  'ai',
  'ml',
];

const TESTING_TERMS = ['jest', 'cypress', 'playwright', 'selenium', 'pytest', 'junit'];

const METHODOLOGY_TERMS = ['agile', 'scrum', 'kanban'];

function matchesTerm(skill: string, terms: string[]): boolean {
  const lower = skill.toLowerCase();
  return terms.some(
    (term) => lower === term || lower.includes(term) || term.includes(lower),
  );
}

export function categorizeJdSkill(skill: string): SkillCategory {
  const lower = skill.toLowerCase();

  if (LANGUAGE_TERMS.has(lower)) {
    return 'Languages';
  }
  if (matchesTerm(skill, FRONTEND_TERMS)) {
    return 'Frontend';
  }
  if (matchesTerm(skill, BACKEND_TERMS)) {
    return 'Backend';
  }
  if (matchesTerm(skill, CLOUD_TERMS)) {
    return 'Cloud & DevOps';
  }
  if (matchesTerm(skill, DATABASE_TERMS)) {
    return 'Database';
  }
  if (matchesTerm(skill, AI_TERMS)) {
    return 'AI & Automation';
  }
  if (matchesTerm(skill, TESTING_TERMS)) {
    return 'Testing';
  }
  if (matchesTerm(skill, METHODOLOGY_TERMS)) {
    return 'Methodology';
  }

  return 'Tools';
}

export function mergeJdSkillsIntoCoreTechnologies(
  skills: Array<{ category: string; items: string[] }>,
  jdSkills: string[],
  enabledCategories: SkillCategory[],
): Array<{ category: string; items: string[] }> {
  if (jdSkills.length === 0) {
    return skills;
  }

  const enabled = new Set(enabledCategories);
  const byCategory = new Map<string, string[]>();

  for (const entry of skills) {
    byCategory.set(entry.category, dedupeSkillsCaseInsensitive(entry.items ?? []));
  }

  for (const jdSkill of jdSkills) {
    const category = categorizeJdSkill(jdSkill);
    if (!enabled.has(category)) {
      continue;
    }

    const label =
      category === 'Database'
        ? 'Databases'
        : category === 'Industry'
          ? 'Industries'
          : category === 'Methodology'
            ? 'Methodologies'
            : category;

    const existing = byCategory.get(label) ?? [];
    if (!isSkillCovered(jdSkill, existing)) {
      byCategory.set(label, dedupeSkillsCaseInsensitive([...existing, jdSkill]));
    }
  }

  return SKILL_CATEGORIES.filter((category) => enabled.has(category))
    .map((category) => {
      const label =
        category === 'Database'
          ? 'Databases'
          : category === 'Industry'
            ? 'Industries'
            : category === 'Methodology'
              ? 'Methodologies'
              : category;
      const items = byCategory.get(label) ?? byCategory.get(category) ?? [];
      return items.length > 0 ? { category: label, items } : null;
    })
    .filter(
      (entry): entry is { category: string; items: string[] } => entry !== null,
    );
}
