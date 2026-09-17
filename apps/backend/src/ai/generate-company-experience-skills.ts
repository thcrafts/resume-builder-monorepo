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

function isCoveredBy(skill: string, skills: string[]): boolean {
  return skills.some((candidate) => techStackSkillsMatch(skill, candidate));
}

export function buildExperienceSkillsUserPrompt(options: {
  company: CompanyEntry;
  achievements: string[];
  companySkillsCount?: number;
  isMostRecent?: boolean;
  recencyRank?: number;
  jdAlignment?: JdAlignmentRequirements;
  jobDescriptionExcerpt?: string;
  keyModernSkills?: string[];
  assignedJdSkills?: string[];
}): string {
  const achievements = options.achievements.map((bullet) => bullet.trim()).filter(Boolean);
  const keyModernSkills = normalizeTechStackSkills(options.keyModernSkills ?? []);
  const assignedJdSkills = normalizeTechStackSkills(options.assignedJdSkills ?? []);

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

  if (options.isMostRecent || options.recencyRank === 0) {
    parts.push(
      'Role type: MOST RECENT — start from technologies in the achievement bullets. Keep candidate key/modern frameworks. ADD assigned mandatory JD skills without replacing the list.',
    );
  } else {
    parts.push(
      'Role type: older role — start from technologies evidenced in these bullets. Keep the modern/key stack. ADD only the assigned (smaller) mandatory subset.',
    );
  }

  if (keyModernSkills.length > 0) {
    parts.push(
      `Candidate key/modern skills (keep these; do not drop them for a JD-only list): ${keyModernSkills.join(', ')}`,
    );
  }

  if (assignedJdSkills.length > 0) {
    parts.push(
      `Mandatory JD skills to ADD (do not replace the list with only these): ${assignedJdSkills.join(', ')}`,
    );
  }

  if (options.jdAlignment) {
    parts.push(
      `JD alignment (for context only — ADD assigned mandatory skills, do not replace the stack):\n${formatJdAlignmentForPrompt(options.jdAlignment)}`,
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

export interface CompanyExperienceSkillExtras {
  keyModernSkills?: string[];
  mandatoryJdSkills?: string[];
}

export function finalizeCompanyExperienceSkills(
  skills: string[],
  achievements: string[],
  companySkillsCount = 0,
  extras?: CompanyExperienceSkillExtras,
): string[] {
  const fromBullets = filterSkillsEvidentInAchievements(
    normalizeTechStackSkills(skills),
    achievements,
  );
  const keyModern = normalizeTechStackSkills(extras?.keyModernSkills ?? []).filter(
    (skill) => !isCoveredBy(skill, fromBullets),
  );
  const mandatory = normalizeTechStackSkills(
    extras?.mandatoryJdSkills ?? [],
  ).filter((skill) => !isCoveredBy(skill, [...fromBullets, ...keyModern]));

  if (companySkillsCount <= 0) {
    return normalizeTechStackSkills([...fromBullets, ...keyModern, ...mandatory]);
  }

  let mandatorySlots = Math.min(
    mandatory.length,
    Math.floor(companySkillsCount * 0.35),
  );
  let modernSlots = Math.min(
    keyModern.length,
    Math.floor(companySkillsCount * 0.45),
  );
  let bulletSlots = Math.max(
    0,
    companySkillsCount - mandatorySlots - modernSlots,
  );

  if (fromBullets.length < bulletSlots) {
    let leftover = bulletSlots - fromBullets.length;
    bulletSlots = fromBullets.length;
    const extraModern = Math.min(leftover, keyModern.length - modernSlots);
    modernSlots += extraModern;
    leftover -= extraModern;
    mandatorySlots = Math.min(mandatory.length, mandatorySlots + leftover);
  }

  return normalizeTechStackSkills([
    ...fromBullets.slice(0, bulletSlots),
    ...keyModern.slice(0, modernSlots),
    ...mandatory.slice(0, mandatorySlots),
  ]);
}

/** Evidence-based fallback when the skills model call fails. */
export function buildEvidenceBasedSkillsFallback(
  achievements: string[],
  jdAlignment?: JdAlignmentRequirements,
  companySkillsCount = 0,
  extras?: CompanyExperienceSkillExtras,
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
    extras,
  );
}
