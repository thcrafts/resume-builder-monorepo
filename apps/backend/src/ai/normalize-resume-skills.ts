import {
  SKILL_CATEGORIES,
  normalizeSkillCategories,
  mergeJdSkillsIntoCoreTechnologies,
  type ResumeSettings,
  type SkillCategory,
} from '@resume-builder/shared';

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

function resolveSkillCategory(category: string): SkillCategory | null {
  for (const canonicalCategory of SKILL_CATEGORIES) {
    if (SKILL_CATEGORY_ALIASES[canonicalCategory].includes(category)) {
      return canonicalCategory;
    }
  }

  return null;
}

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
    const toolsEnabled = enabled.has('Tools');
    const fallbackCategory: SkillCategory | null = toolsEnabled
      ? 'Tools'
      : [...enabled][0] ?? null;

    // Prefer putting unmatched role skills into an existing category that already
    // has overlapping tokens; otherwise append to Tools (or first enabled).
    for (const roleSkill of roleSkills) {
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
  );

  if (
    settings.includeJdSkillsInCoreTechnologies &&
    (sources.jdSkills?.length ?? 0) > 0
  ) {
    return mergeJdSkillsIntoCoreTechnologies(
      categorized,
      sources.jdSkills ?? [],
      [...enabled],
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

function finalizeSkillsMap(
  skillsByCategory: Map<SkillCategory, string[]>,
  enabled: Set<SkillCategory>,
  skillsPerCategoryCount: number,
): Array<{ category: string; items: string[] }> {
  const perCategoryLimit =
    skillsPerCategoryCount > 0 ? skillsPerCategoryCount : undefined;

  return SKILL_CATEGORIES.reduce<Array<{ category: string; items: string[] }>>(
    (results, category) => {
      if (!enabled.has(category)) {
        return results;
      }

      const items = skillsByCategory.get(category) ?? [];
      if (items.length === 0) {
        return results;
      }

      results.push({
        category,
        items: perCategoryLimit ? items.slice(0, perCategoryLimit) : items,
      });
      return results;
    },
    [],
  );
}
