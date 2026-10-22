import {
  SKILL_CATEGORIES,
  normalizeSkillCategories,
  mergeJdSkillsIntoCoreTechnologies,
  isSkillCovered,
  categorizeJdSkill,
  resolveSkillCategory,
  MIN_SKILLS_PER_CATEGORY,
  type ResumeSettings,
  type SkillCategory,
} from '@resume-builder/shared';

function dedupeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
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

function mergeIntoCategory(
  skillsByCategory: Map<SkillCategory, string[]>,
  category: SkillCategory,
  items: string[],
) {
  const existing = skillsByCategory.get(category) ?? [];
  skillsByCategory.set(category, dedupeItems([...existing, ...items]));
}

/**
 * Merge AI skills with baseline + role-proven skills so the section stays rich
 * even if the model returns a shortlist.
 */
export function enrichSkillsWithSources(
  skills: Array<{ category: string; items: string[] }>,
  sources: {
    baselineSkills?: Array<{ category: string; items: string[] }>;
    roleSkills?: string[];
    jdSkills?: string[];
  },
  settings: ResumeSettings,
): Array<{ category: string; items: string[] }> {
  const enabled = new Set(normalizeSkillCategories(settings.skillCategories));
  const skillsByCategory = new Map<SkillCategory, string[]>();

  for (const skill of skills) {
    const canonicalCategory = resolveSkillCategory(skill.category);
    if (!canonicalCategory || !enabled.has(canonicalCategory)) {
      continue;
    }
    mergeIntoCategory(skillsByCategory, canonicalCategory, skill.items ?? []);
  }

  for (const skill of sources.baselineSkills ?? []) {
    const canonicalCategory = resolveSkillCategory(skill.category);
    if (!canonicalCategory || !enabled.has(canonicalCategory)) {
      continue;
    }
    mergeIntoCategory(skillsByCategory, canonicalCategory, skill.items ?? []);
  }

  const roleSkills = (sources.roleSkills ?? []).map((s) => s.trim()).filter(Boolean);
  if (roleSkills.length > 0) {
    // Prefer an existing category with overlapping tokens; otherwise use the
    // skill's inferred category (or the first enabled one).
    for (const roleSkill of roleSkills) {
      const inferred = categorizeJdSkill(roleSkill);
      const fallbackCategory: SkillCategory | null = enabled.has(inferred)
        ? inferred
        : [...enabled][0] ?? null;
      let placed = false;
      const roleKey = roleSkill.toLowerCase();

      for (const [category, items] of skillsByCategory) {
        if (items.some((item) => item.toLowerCase() === roleKey)) {
          placed = true;
          break;
        }
      }

      if (placed) {
        continue;
      }

      for (const [category, items] of skillsByCategory) {
        if (
          items.some(
            (item) =>
              roleKey.includes(item.toLowerCase()) ||
              item.toLowerCase().includes(roleKey),
          )
        ) {
          mergeIntoCategory(skillsByCategory, category, [roleSkill]);
          placed = true;
          break;
        }
      }

      if (!placed && fallbackCategory) {
        mergeIntoCategory(skillsByCategory, fallbackCategory, [roleSkill]);
      }
    }
  }

  const categorized = finalizeSkillsMap(
    skillsByCategory,
    enabled,
    settings.skillsPerCategoryCount,
    {
      minPerCategory: MIN_SKILLS_PER_CATEGORY,
      baselineSkills: sources.baselineSkills,
      roleSkills: sources.roleSkills,
      jdSkills: sources.jdSkills,
    },
  );

  if (
    settings.includeJdSkillsInCoreTechnologies &&
    (sources.jdSkills?.length ?? 0) > 0
  ) {
    const withJd = mergeJdSkillsIntoCoreTechnologies(
      categorized,
      sources.jdSkills ?? [],
      [...enabled],
    );
    return applyPerCategoryBounds(
      withJd,
      settings.skillsPerCategoryCount,
      sources.jdSkills,
      {
        minPerCategory: MIN_SKILLS_PER_CATEGORY,
        baselineSkills: sources.baselineSkills,
        roleSkills: sources.roleSkills,
        jdSkills: sources.jdSkills,
      },
    );
  }

  return categorized;
}

export function normalizeGeneratedSkills(
  skills: Array<{ category: string; items: string[] }>,
  settings: ResumeSettings,
): Array<{ category: string; items: string[] }> {
  const enabled = new Set(normalizeSkillCategories(settings.skillCategories));
  const skillsByCategory = new Map<SkillCategory, string[]>();

  for (const skill of skills) {
    const canonicalCategory = resolveSkillCategory(skill.category);
    if (!canonicalCategory || !enabled.has(canonicalCategory)) {
      continue;
    }

    mergeIntoCategory(skillsByCategory, canonicalCategory, skill.items ?? []);
  }

  return finalizeSkillsMap(skillsByCategory, enabled, settings.skillsPerCategoryCount);
}

function collectSourcePool(sources: {
  baselineSkills?: Array<{ category: string; items: string[] }>;
  roleSkills?: string[];
  jdSkills?: string[];
}): string[] {
  const baseline = (sources.baselineSkills ?? []).flatMap((entry) => entry.items ?? []);
  const role = sources.roleSkills ?? [];
  const jd = sources.jdSkills ?? [];
  return dedupeItems([...baseline, ...role, ...jd]);
}

function buildCategoryPool(
  category: SkillCategory,
  sources: {
    baselineSkills?: Array<{ category: string; items: string[] }>;
    roleSkills?: string[];
    jdSkills?: string[];
  },
): string[] {
  const baseline = (sources.baselineSkills ?? [])
    .filter((entry) => resolveSkillCategory(entry.category) === category)
    .flatMap((entry) => entry.items ?? []);

  const related = collectSourcePool(sources).filter(
    (skill) => categorizeJdSkill(skill) === category,
  );

  return dedupeItems([...baseline, ...related]);
}

function padCategoryToMinimum(
  category: SkillCategory,
  entry: { category: string; items: string[] },
  minCount: number,
  sources: {
    baselineSkills?: Array<{ category: string; items: string[] }>;
    roleSkills?: string[];
    jdSkills?: string[];
  },
): { category: string; items: string[] } {
  if (minCount <= 0 || entry.items.length >= minCount) {
    return entry;
  }

  const pool = buildCategoryPool(category, sources);
  const items = [...entry.items];
  for (const candidate of pool) {
    if (items.length >= minCount) {
      break;
    }
    if (!isSkillCovered(candidate, items)) {
      items.push(candidate);
    }
  }

  return { category: entry.category, items };
}

function applyPerCategoryBounds(
  skills: Array<{ category: string; items: string[] }>,
  skillsPerCategoryCount: number,
  prioritySkills: string[] = [],
  options?: {
    minPerCategory?: number;
    baselineSkills?: Array<{ category: string; items: string[] }>;
    roleSkills?: string[];
    jdSkills?: string[];
  },
): Array<{ category: string; items: string[] }> {
  const minCount =
    skillsPerCategoryCount > 0
      ? Math.min(options?.minPerCategory ?? MIN_SKILLS_PER_CATEGORY, skillsPerCategoryCount)
      : 0;

  return skills
    .map((entry) => {
      const canonicalCategory = resolveSkillCategory(entry.category);
      if (!canonicalCategory) {
        return entry;
      }

      const priority = entry.items.filter((item) =>
        isSkillCovered(item, prioritySkills),
      );
      const remainder = entry.items.filter(
        (item) => !isSkillCovered(item, prioritySkills),
      );
      let items = [...priority, ...remainder];
      if (skillsPerCategoryCount > 0) {
        items = items.slice(0, skillsPerCategoryCount);
      }
      return padCategoryToMinimum(
        canonicalCategory,
        { category: entry.category, items },
        minCount,
        {
          baselineSkills: options?.baselineSkills,
          roleSkills: options?.roleSkills,
          jdSkills: options?.jdSkills,
        },
      );
    })
    .filter((entry) => entry.items.length > 0);
}

function finalizeSkillsMap(
  skillsByCategory: Map<SkillCategory, string[]>,
  enabled: Set<SkillCategory>,
  skillsPerCategoryCount: number,
  options?: {
    minPerCategory?: number;
    baselineSkills?: Array<{ category: string; items: string[] }>;
    roleSkills?: string[];
    jdSkills?: string[];
  },
): Array<{ category: string; items: string[] }> {
  const perCategoryLimit =
    skillsPerCategoryCount > 0 ? skillsPerCategoryCount : undefined;
  const minCount =
    perCategoryLimit && (options?.minPerCategory ?? MIN_SKILLS_PER_CATEGORY) > 0
      ? Math.min(options?.minPerCategory ?? MIN_SKILLS_PER_CATEGORY, perCategoryLimit)
      : 0;

  return SKILL_CATEGORIES.reduce<Array<{ category: string; items: string[] }>>(
    (results, category) => {
      if (!enabled.has(category)) {
        return results;
      }

      let items = skillsByCategory.get(category) ?? [];
      if (items.length === 0) {
        return results;
      }

      if (perCategoryLimit) {
        items = items.slice(0, perCategoryLimit);
      }

      if (minCount > 0) {
        const padded = padCategoryToMinimum(
          category,
          { category, items },
          minCount,
          {
            baselineSkills: options?.baselineSkills,
            roleSkills: options?.roleSkills,
            jdSkills: options?.jdSkills,
          },
        );
        items = padded.items;
      }

      if (items.length === 0) {
        return results;
      }

      results.push({ category, items });
      return results;
    },
    [],
  );
}
