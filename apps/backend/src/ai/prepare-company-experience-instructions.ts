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

  const achievementsCount =
    options.achievementsCount && options.achievementsCount > 0
      ? options.achievementsCount
      : 6;
  const experienceJsonSchema = buildExperienceJsonSchema({
    achievementsCount,
  });

  parts.push(`MANDATORY OUTPUT RULES
- Return valid JSON only matching this schema:
${JSON.stringify(experienceJsonSchema, null, 2)}
- achievements must contain exactly ${achievementsCount} full resume bullet sentences as plain strings (not objects).
- Do NOT return a skills field — skills are generated from these bullets in a later step.
- Example (with metric — required in 1–2 bullets): "Cut p95 API latency 40% by redesigning the caching layer on the clinical data platform."
- Example (no metric — use for the remaining bullets): "Led checkout rewrite for the payments platform, improving reliability under peak traffic."
- Do NOT return objects like {"text":"..."} — each achievements array item must be a string.
- NEVER pad the achievements array with true, false, null, numbers, or empty strings — every slot must be a real sentence.
- NEVER include the company name in any achievement bullet.
- NEVER change the official job title to the JD title.
- Do not replace company experience with JD skills. Write about this company's product, mission, job type, and extra context.
- Keep recent modern frameworks, languages, and key technologies from the candidate skill set in those product bullets.
- ADD assigned mandatory JD skill names into that existing-work story, together with modern skillsets. No gap-fill, no implied stacks, no weak evidence.
- Most recent role: include the mandatory JD skills and the mandatory JD experience on the main product, added realistically with modern skillsets. Older roles: weaker match with fewer assigned skills.
- Each achievement is one sentence: strong action + this company's work + modern/key and added mandatory skill + impact.
- Numerical improvements (%, ms, $, users, x, weeks) REQUIRED in exactly 1–2 bullets total. The remaining bullets must have no numeric improvement metrics.
- When Target Role Alignment lists mandatory JD skills or experience for this role, add those into bullets about this employer's main product. Older roles receive fewer skills to add and must stay historically plausible.
- Do not include a responsibilities field.
- Do not invent employers, dates, or unsupported technologies.`);

  const overlay = options.industryOverlay?.trim();
  if (overlay) {
    parts.push(`INDUSTRY HINTS:\n${overlay}`);
  }

  return parts.join('\n\n');
}
