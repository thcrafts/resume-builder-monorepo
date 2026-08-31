export const SKILL_CATEGORIES = [
  'Languages',
  'Backend',
  'Frontend',
  'AI & Automation',
  'Cloud & DevOps',
  'Database',
  'Tools',
  'Testing',
  'Industry',
  'Methodology',
  'Mobile',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

const SKILL_CATEGORY_LABELS: Partial<Record<SkillCategory, string>> = {
  Database: 'Databases',
  Industry: 'Industries',
  Methodology: 'Methodologies',
};

export function getSkillCategoryLabel(category: SkillCategory): string {
  return SKILL_CATEGORY_LABELS[category] ?? category;
}

export interface ResumeSettings {
  showTitle: boolean;
  showSubTitle: boolean;
  showCompanySkills: boolean;
  skillCategories: SkillCategory[];
  useDefaultOutputFormat: boolean;
  responsibilitiesCount: number;
  achievementsCount: number;
  skillsPerCategoryCount: number;
  companySkillsCount: number;
  /** When true, Core Technologies includes all JD-extracted skills. */
  includeJdSkillsInCoreTechnologies: boolean;
}

export interface ResumePdfSettings {
  showTitle: boolean;
  showSubTitle: boolean;
  showCompanySkills: boolean;
  skillCategories: SkillCategory[];
  skillsPerCategoryCount: number;
}

export const MAX_EXPERIENCE_BULLETS_PER_ROLE = 6;
export const MIN_COMPANY_SKILL_COUNT = 7;
export const MAX_COMPANY_SKILL_COUNT = 12;
/** 0 = no limit (rich technical skills section). Soft upper clamp only. */
export const MAX_SKILLS_PER_CATEGORY = 40;

export const DEFAULT_RESUME_SETTINGS: ResumeSettings = {
  showTitle: true,
  showSubTitle: false,
  showCompanySkills: true,
  skillCategories: [...SKILL_CATEGORIES],
  useDefaultOutputFormat: true,
  responsibilitiesCount: 0,
  achievementsCount: 6,
  skillsPerCategoryCount: 0,
  companySkillsCount: 10,
  includeJdSkillsInCoreTechnologies: true,
};

export const DEFAULT_RESUME_PDF_SETTINGS: ResumePdfSettings = {
  showTitle: true,
  showSubTitle: false,
  showCompanySkills: true,
  skillCategories: [...SKILL_CATEGORIES],
  skillsPerCategoryCount: DEFAULT_RESUME_SETTINGS.skillsPerCategoryCount,
};

const SKILL_CATEGORY_SET = new Set<string>(SKILL_CATEGORIES);

function clampCount(value: unknown, fallback: number, max = 30): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(0, Math.round(parsed)));
}

function clampAchievementCount(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed);
  if (rounded <= 0) {
    return fallback;
  }

  return Math.min(MAX_EXPERIENCE_BULLETS_PER_ROLE, rounded);
}

function clampSkillsPerCategoryCount(value: unknown, fallback: number): number {
  return clampCount(value, fallback, MAX_SKILLS_PER_CATEGORY);
}

function clampCompanySkillCount(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed);
  if (rounded === 0) {
    return 0;
  }

  return Math.min(
    MAX_COMPANY_SKILL_COUNT,
    Math.max(MIN_COMPANY_SKILL_COUNT, rounded),
  );
}

export function normalizeSkillCategories(
  categories: unknown,
): SkillCategory[] {
  if (!Array.isArray(categories)) {
    return [...SKILL_CATEGORIES];
  }

  const enabled = new Set(
    categories.filter(
      (category): category is SkillCategory =>
        typeof category === 'string' && SKILL_CATEGORY_SET.has(category),
    ),
  );

  if (enabled.size === 0) {
    return [...SKILL_CATEGORIES];
  }

  return SKILL_CATEGORIES.filter((category) => enabled.has(category));
}

export function resolveResumeSettings(
  partial?: Partial<ResumeSettings> | null,
): ResumeSettings {
  const base = {
    ...DEFAULT_RESUME_SETTINGS,
    ...(partial ?? {}),
  };

  return {
    showTitle: partial?.showTitle ?? base.showTitle ?? true,
    showSubTitle: partial?.showSubTitle ?? base.showSubTitle ?? false,
    showCompanySkills:
      partial?.showCompanySkills ?? base.showCompanySkills ?? true,
    skillCategories: normalizeSkillCategories(base.skillCategories),
    useDefaultOutputFormat:
      partial?.useDefaultOutputFormat ?? base.useDefaultOutputFormat ?? true,
    responsibilitiesCount: 0,
    achievementsCount: clampAchievementCount(
      base.achievementsCount,
      DEFAULT_RESUME_SETTINGS.achievementsCount,
    ),
    skillsPerCategoryCount: clampSkillsPerCategoryCount(
      base.skillsPerCategoryCount,
      DEFAULT_RESUME_SETTINGS.skillsPerCategoryCount,
    ),
    companySkillsCount: clampCompanySkillCount(
      base.companySkillsCount,
      DEFAULT_RESUME_SETTINGS.companySkillsCount,
    ),
    includeJdSkillsInCoreTechnologies:
      partial?.includeJdSkillsInCoreTechnologies ??
      base.includeJdSkillsInCoreTechnologies ??
      true,
  };
}

export function getResumePdfSettings(
  settings: ResumeSettings,
): ResumePdfSettings {
  return {
    showTitle: settings.showTitle,
    showSubTitle: settings.showSubTitle,
    showCompanySkills: settings.showCompanySkills,
    skillCategories: settings.skillCategories,
    skillsPerCategoryCount: settings.skillsPerCategoryCount,
  };
}

export function resumeSettingsEqual(
  a: ResumeSettings,
  b: ResumeSettings,
): boolean {
  if (
    a.showTitle !== b.showTitle ||
    a.showSubTitle !== b.showSubTitle ||
    a.showCompanySkills !== b.showCompanySkills ||
    a.useDefaultOutputFormat !== b.useDefaultOutputFormat ||
    a.responsibilitiesCount !== b.responsibilitiesCount ||
    a.achievementsCount !== b.achievementsCount ||
    a.skillsPerCategoryCount !== b.skillsPerCategoryCount ||
    a.companySkillsCount !== b.companySkillsCount ||
    a.includeJdSkillsInCoreTechnologies !== b.includeJdSkillsInCoreTechnologies
  ) {
    return false;
  }

  if (a.skillCategories.length !== b.skillCategories.length) {
    return false;
  }

  return a.skillCategories.every(
    (category, index) => category === b.skillCategories[index],
  );
}

const SKILL_CATEGORY_ALIASES: Record<SkillCategory, readonly string[]> = {
  Languages: ['Languages'],
  Backend: ['Backend'],
  Frontend: ['Frontend'],
  'AI & Automation': ['AI & Automation'],
  'Cloud & DevOps': ['Cloud & DevOps'],
  Database: ['Database', 'Databases'],
  Tools: ['Tools'],
  Testing: ['Testing'],
  Industry: ['Industry', 'Industries'],
  Methodology: ['Methodology', 'Methodologies'],
  Mobile: ['Mobile'],
};

const SKILL_CATEGORY_PDF_LABELS: Partial<Record<SkillCategory, string>> = {
  Database: 'Databases',
  Industry: 'Industries',
  Methodology: 'Methodologies',
};

function resolveSkillCategory(category: string): SkillCategory | null {
  for (const canonicalCategory of SKILL_CATEGORIES) {
    if (SKILL_CATEGORY_ALIASES[canonicalCategory].includes(category)) {
      return canonicalCategory;
    }
  }

  return null;
}

function getSkillCategoryPdfLabel(category: SkillCategory): string {
  return SKILL_CATEGORY_PDF_LABELS[category] ?? category;
}

export function filterSkillsForPdf(
  skills: Array<{ category: string; items: string[] }>,
  enabledCategories: SkillCategory[] | undefined,
  skillsPerCategoryCount = 0,
): Array<{ category: string; items: string[] }> {
  const enabled = new Set(
    enabledCategories && enabledCategories.length > 0
      ? normalizeSkillCategories(enabledCategories)
      : [...SKILL_CATEGORIES],
  );

  const normalizedSkills = Array.isArray(skills) ? skills : [];

  const skillsByCategory = new Map<
    SkillCategory,
    { category: string; items: string[] }
  >();

  for (const skill of normalizedSkills) {
    const canonicalCategory = resolveSkillCategory(skill.category);
    if (
      !canonicalCategory ||
      !Array.isArray(skill.items) ||
      skill.items.length === 0
    ) {
      continue;
    }

    const existing = skillsByCategory.get(canonicalCategory);
    if (existing) {
      existing.items.push(...skill.items);
      continue;
    }

    skillsByCategory.set(canonicalCategory, {
      category: getSkillCategoryPdfLabel(canonicalCategory),
      items: [...skill.items],
    });
  }

  const perCategoryLimit =
    skillsPerCategoryCount > 0 ? skillsPerCategoryCount : undefined;

  return SKILL_CATEGORIES.filter((category) => enabled.has(category))
    .map((category) => skillsByCategory.get(category))
    .filter(
      (skill): skill is { category: string; items: string[] } =>
        !!skill && Array.isArray(skill.items) && skill.items.length > 0,
    )
    .map((skill) => ({
      category: skill.category,
      items: perCategoryLimit
        ? skill.items.slice(0, perCategoryLimit)
        : skill.items,
    }));
}
