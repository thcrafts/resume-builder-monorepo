import {
  DEFAULT_COMPANY_EXPERIENCE_PROMPT,
} from '@resume-builder/shared';
import { buildExperienceJsonSchema } from './schemas/experience.schema';

/** Remove employer name mentions so bullets stay generic/credible. */
export function stripCompanyNameFromBullets(
  bullets: string[],
  companyName: string,
): string[] {
  const name = companyName.trim();
  if (!name) {
    return bullets;
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const atCompany = new RegExp(`\\bAt\\s+${escaped}\\b[,:]?\\s*`, 'gi');
  const bareCompany = new RegExp(`\\b${escaped}\\b[,:]?\\s*`, 'gi');

  return bullets.map((bullet) => {
    let next = bullet
      .replace(atCompany, '')
      .replace(bareCompany, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .trim();

    if (next && /^[a-z]/.test(next)) {
      next = next.charAt(0).toUpperCase() + next.slice(1);
    }

    return next;
  });
}

export function prepareCompanyExperienceInstructions(options: {
  experiencePrompt?: string | null;
  industryOverlay?: string | null;
  companySkillsCount?: number;
  achievementsCount?: number;
}): string {
  const parts = [DEFAULT_COMPANY_EXPERIENCE_PROMPT];

  const custom = options.experiencePrompt?.trim();
  if (custom) {
    parts.push(`USER EXPERIENCE PROMPT:\n${custom}`);
  }

  const companySkillsCount = options.companySkillsCount ?? 0;
  const achievementsCount =
    options.achievementsCount && options.achievementsCount > 0
      ? options.achievementsCount
      : 6;
  const experienceJsonSchema = buildExperienceJsonSchema({
    companySkillsCount,
    achievementsCount,
  });

  parts.push(`MANDATORY OUTPUT RULES
- Return valid JSON only matching this schema:
${JSON.stringify(experienceJsonSchema, null, 2)}
- PRIMARY: achievements must contain exactly ${achievementsCount} full resume bullet sentences as plain strings (not objects).
- Example (with metric — required in 1–2 bullets): "Cut p95 API latency 40% by redesigning the caching layer."
- Example (no metric — use for the remaining bullets): "Led checkout rewrite for the payments platform, improving reliability under peak traffic."
- Do NOT return objects like {"text":"..."} — each achievements array item must be a string.
- NEVER pad the achievements array with true, false, null, numbers, or empty strings — every slot must be a real sentence.
- NEVER include the company name in any achievement bullet.
- Do NOT force product or mission wording into every bullet.
- Each achievement is one sentence: strong action + what was built/owned + technical context + impact.
- Numerical improvements (%, ms, $, users, x, weeks) REQUIRED in exactly 1–2 bullets total. The remaining bullets must have no numeric improvement metrics.
- SECONDARY: skills are short TECH STACK names only (1–4 words): languages, frameworks, databases, cloud platforms, tools.
- Never put compliance, design practices, soft skills, or achievement sentences in skills.
- Use AWS (not EC2/RDS/S3), Azure (not individual Azure services), GCP (not individual GCP services).
- Do not include a responsibilities field.
- Do not invent employers, dates, or unsupported technologies.${
    companySkillsCount > 0
      ? `\n- skills: about ${companySkillsCount} role-relevant technologies (7-12 is fine).`
      : ''
  }`);

  const overlay = options.industryOverlay?.trim();
  if (overlay) {
    parts.push(`INDUSTRY HINTS:\n${overlay}`);
  }

  return parts.join('\n\n');
}
