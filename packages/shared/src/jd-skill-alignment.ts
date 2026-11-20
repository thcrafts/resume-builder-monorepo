import type { JdAlignmentRequirements } from './jd-alignment';
import { isTitleSimilarToJd } from './job-title-family';
import {
  SKILL_CATEGORIES,
  resolveSkillCategory,
  type SkillCategory,
} from './resume-settings';
import {
  normalizeTechStackSkills,
  techStackSkillsMatch,
  isNonTechStackSkill,
} from './tech-stack-skills';

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

const KEY_MODERN_CATEGORY_HINTS = [
  'language',
  'frontend',
  'backend',
  'cloud',
  'devops',
  'database',
  'data',
  'messaging',
  'ai',
  'automation',
  'mobile',
  'framework',
  'tool',
  'testing',
] as const;

const SKIP_BASELINE_CATEGORY_HINTS = ['industr', 'methodolog', 'architecture'];

function keyModernCategoryPriority(label: string): number {
  const lower = label.toLowerCase();
  const index = KEY_MODERN_CATEGORY_HINTS.findIndex((hint) =>
    lower.includes(hint),
  );
  return index === -1 ? KEY_MODERN_CATEGORY_HINTS.length : index;
}

/**
 * Languages, modern frameworks, and key technologies from the candidate skill set.
 * Skips industry/methodology chips that are not stack items.
 */
export function collectKeyModernBaselineSkills(
  baseline: Array<{ category?: string; items?: string[] }> | undefined,
): string[] {
  const categories = [...(baseline ?? [])].sort(
    (a, b) =>
      keyModernCategoryPriority(a.category ?? '') -
      keyModernCategoryPriority(b.category ?? ''),
  );

  const matched: string[] = [];
  const fallback: string[] = [];

  for (const category of categories) {
    const label = (category.category ?? '').toLowerCase();
    const items = category.items ?? [];
    if (SKIP_BASELINE_CATEGORY_HINTS.some((hint) => label.includes(hint))) {
      continue;
    }
    if (
      !label ||
      KEY_MODERN_CATEGORY_HINTS.some((hint) => label.includes(hint))
    ) {
      matched.push(...items);
    } else {
      fallback.push(...items);
    }
  }

  return normalizeTechStackSkills(matched.length > 0 ? matched : fallback);
}

export function isSkillCovered(skill: string, skills: string[]): boolean {
  const key = skill.trim().toLowerCase();
  if (!key) {
    return false;
  }

  return skills.some((candidate) => techStackSkillsMatch(skill, candidate));
}

/** Recency 0 = most recent role. Expression of JD skills is strongest there and tapers. */
export const JD_SKILL_RECENCY_RATES = [1, 0.7, 0.45, 0.25] as const;

export function recencyExpressionRate(recencyRank: number): number {
  const index = Math.min(
    Math.max(0, recencyRank),
    JD_SKILL_RECENCY_RATES.length - 1,
  );
  return JD_SKILL_RECENCY_RATES[index];
}

export type RandomFn = () => number;

function shuffleInPlace<T>(items: T[], rng: RandomFn): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function selectJdSkillsForRecency(
  jdSkills: string[],
  recencyRank: number,
  options?: { previousCount?: number; rng?: RandomFn },
): string[] {
  const skills = normalizeTechStackSkills(jdSkills);
  if (skills.length === 0) {
    return [];
  }

  if (recencyRank <= 0) {
    return skills;
  }

  const rng = options?.rng ?? Math.random;
  const rate = recencyExpressionRate(recencyRank);
  const jitter = 0.5 + 0.5 * rng();
  let count = Math.floor(skills.length * rate * jitter);
  const maxVsPrevious =
    options?.previousCount != null
      ? Math.max(0, options.previousCount - 1)
      : skills.length - 1;
  count = Math.min(count, maxVsPrevious, skills.length - 1);
  count = Math.max(1, count);

  return shuffleInPlace([...skills], rng).slice(0, count);
}

export interface PlanJdTechStackOptions {
  /** JD target role title; when set, only title-similar companies get assigned skills. */
  jdRoleTitle?: string;
  rng?: RandomFn;
}

/** Pre-assign JD tech-stack skills per company before AI generation (sorted most-recent first). */
export function planJdTechStackPerCompany(
  companies: Array<{ id: string; title?: string }>,
  jdSkills: string[],
  rngOrOptions: RandomFn | PlanJdTechStackOptions = Math.random,
): Map<string, string[]> {
  const options: PlanJdTechStackOptions =
    typeof rngOrOptions === 'function'
      ? { rng: rngOrOptions }
      : rngOrOptions ?? {};
  const rng = options.rng ?? Math.random;
  const jdRoleTitle = options.jdRoleTitle?.trim() ?? '';

  const plan = new Map<string, string[]>();
  let previousCount = normalizeTechStackSkills(jdSkills).length;
  let eligibleRecencyRank = 0;

  companies.forEach((company) => {
    const eligible =
      !jdRoleTitle ||
      isTitleSimilarToJd(company.title ?? '', jdRoleTitle);

    if (!eligible) {
      plan.set(company.id, []);
      return;
    }

    const selected = selectJdSkillsForRecency(jdSkills, eligibleRecencyRank, {
      previousCount: eligibleRecencyRank === 0 ? undefined : previousCount,
      rng,
    });
    plan.set(company.id, selected);
    previousCount = selected.length;
    eligibleRecencyRank += 1;
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
];

const ARCHITECTURE_TERMS = [
  'microservices',
  'event-driven',
  'event driven',
  'domain-driven',
  'ddd',
  'system design',
  'distributed systems',
  'serverless architecture',
  'design patterns',
  'clean architecture',
  'cqrs',
  'event sourcing',
  'api design',
  'agile',
  'scrum',
  'kanban',
];

const INDUSTRY_TERMS = [
  'healthcare',
  'fintech',
  'banking',
  'insurance',
  'e-commerce',
  'ecommerce',
  'retail',
  'saas',
  'logistics',
  'telecom',
  'edtech',
  'govtech',
  'media',
  'gaming',
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
  'snowflake',
  'bigquery',
  'kafka',
  'rabbitmq',
  'sqs',
  'sns',
  'kinesis',
  'pub/sub',
  'airflow',
  'spark',
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
  if (matchesTerm(skill, ARCHITECTURE_TERMS)) {
    return 'Architecture';
  }
  if (matchesTerm(skill, DATABASE_TERMS)) {
    return 'Data & Messaging';
  }
  if (matchesTerm(skill, BACKEND_TERMS)) {
    return 'Backend';
  }
  if (matchesTerm(skill, CLOUD_TERMS)) {
    return 'Cloud & DevOps';
  }
  if (matchesTerm(skill, AI_TERMS)) {
    return 'AI';
  }
  if (matchesTerm(skill, TESTING_TERMS)) {
    return 'Testing';
  }
  if (matchesTerm(skill, INDUSTRY_TERMS)) {
    return 'Industries';
  }

  return 'Cloud & DevOps';
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
    const category = resolveSkillCategory(entry.category) ?? entry.category;
    byCategory.set(
      category,
      dedupeSkillsCaseInsensitive([
        ...(byCategory.get(category) ?? []),
        ...(entry.items ?? []),
      ]),
    );
  }

  for (const jdSkill of jdSkills) {
    const category = categorizeJdSkill(jdSkill);
    if (!enabled.has(category)) {
      continue;
    }

    const existing = byCategory.get(category) ?? [];
    if (!isSkillCovered(jdSkill, existing)) {
      byCategory.set(category, dedupeSkillsCaseInsensitive([...existing, jdSkill]));
    }
  }

  return SKILL_CATEGORIES.filter((category) => enabled.has(category))
    .map((category): { category: string; items: string[] } | null => {
      const items = byCategory.get(category) ?? [];
      return items.length > 0 ? { category, items } : null;
    })
    .filter(
      (entry): entry is { category: string; items: string[] } => entry !== null,
    );
}
