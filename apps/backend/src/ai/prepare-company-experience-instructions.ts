import {
  DEFAULT_COMPANY_EXPERIENCE_PROMPT,
} from '@resume-builder/shared';
import { buildExperienceJsonSchema } from './schemas/experience.schema';

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
- Example achievements item: "Led checkout rewrite for Payments Hub, cutting p95 latency 40% and lifting conversion 12%."
- Do NOT return objects like {"text":"..."} — each achievements array item must be a string.
- Each achievement is one sentence: action + scope + quantified outcome (include a number like %, ms, $, users, weeks).
- Each achievement must naturally reference the company product and mission.
- SECONDARY: skills are short TECH STACK names only (1–4 words): languages, frameworks, databases, cloud platforms, tools.
- Never put compliance, design practices, soft skills, or achievement sentences in skills.
- Use AWS (not EC2/RDS/S3), Azure (not individual Azure services), GCP (not individual GCP services).
- Do not include a responsibilities field.
- Do not invent employers, dates, product names, or unsupported technologies.${
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
