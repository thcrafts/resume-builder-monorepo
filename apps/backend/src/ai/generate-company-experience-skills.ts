import {
  formatJdAlignmentForPrompt,
  normalizeTechStackSkills,
  techStackSkillsMatch,
  type CompanyEntry,
  type JdAlignmentRequirements,
} from '@resume-builder/shared';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when a skill is explicitly mentioned or clearly implied in achievement text. */
export function isSkillEvidentInText(skill: string, text: string): boolean {
  const trimmedSkill = skill.trim();
  const trimmedText = text.trim();
  if (!trimmedSkill || !trimmedText) {
    return false;
  }

  if (techStackSkillsMatch(trimmedSkill, trimmedText)) {
    return true;
  }

  const escaped = escapeRegex(trimmedSkill);
  return new RegExp(`\\b${escaped}\\b`, 'i').test(trimmedText);
}

/** Keep only skills supported by at least one achievement bullet. */
export function filterSkillsEvidentInAchievements(
  skills: string[],
  achievements: string[],
): string[] {
  if (achievements.length === 0) {
    return [];
  }

  return skills.filter((skill) =>
    achievements.some((bullet) => isSkillEvidentInText(skill, bullet)),
  );
}

export function buildExperienceSkillsUserPrompt(options: {
  company: CompanyEntry;
  achievements: string[];
  companySkillsCount?: number;
  isMostRecent?: boolean;
  jdAlignment?: JdAlignmentRequirements;
  jobDescriptionExcerpt?: string;
}): string {
  const achievements = options.achievements.map((bullet) => bullet.trim()).filter(Boolean);

  const parts = [
    `Company: ${options.company.company}`,
    `Title: ${options.company.title}`,
    `Dates: ${options.company.date_range}`,
    `Product: ${options.company.product}`,
    `Mission: ${options.company.mission}`,
    options.company.context
      ? `Additional context: ${options.company.context}`
      : '',
    `Achievement bullets:\n${achievements.map((bullet) => `- ${bullet}`).join('\n')}`,
  ].filter(Boolean);

  if (options.isMostRecent) {
    parts.push(
      'Role type: MOST RECENT — extract technologies from the achievement bullets only.',
    );
  } else {
    parts.push(
      'Role type: older role — extract only technologies evidenced in these bullets.',
    );
  }

  if (options.jdAlignment) {
    parts.push(
      `JD alignment (for context only — do NOT add skills unless they appear in the bullets):\n${formatJdAlignmentForPrompt(options.jdAlignment)}`,
    );
  }

  const excerpt = options.jobDescriptionExcerpt?.trim();
  if (excerpt) {
    parts.push(`Job description excerpt (context only):\n${excerpt}`);
  }

  if (options.companySkillsCount && options.companySkillsCount > 0) {
    parts.push(`Target skill count: about ${options.companySkillsCount}`);
  }

  return parts.join('\n\n');
}

export function finalizeCompanyExperienceSkills(
  skills: string[],
  achievements: string[],
  companySkillsCount = 0,
): string[] {
  const normalized = normalizeTechStackSkills(skills);
  const evident = filterSkillsEvidentInAchievements(normalized, achievements);

  if (companySkillsCount <= 0) {
    return evident;
  }

  return evident.slice(0, companySkillsCount);
}

/** Evidence-based fallback when the skills model call fails. */
export function buildEvidenceBasedSkillsFallback(
  achievements: string[],
  jdAlignment?: JdAlignmentRequirements,
  companySkillsCount = 0,
): string[] {
  const candidates = jdAlignment
    ? normalizeTechStackSkills([
        ...jdAlignment.languages,
        ...jdAlignment.requiredSkills,
      ])
    : [];

  return finalizeCompanyExperienceSkills(
    candidates,
    achievements,
    companySkillsCount,
  );
}
