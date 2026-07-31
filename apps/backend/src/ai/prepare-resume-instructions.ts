import { cleanText } from './clean-text';

const RESUME_ONLY_NOTICE = `IMPORTANT: Return only the resume JSON object. Do not include cover_letter or any cover letter text. Cover letters are generated separately on demand.`;

const EXPERIENCE_BULLET_RULES = `EXPERIENCE BULLET RULES (MANDATORY)
- responsibilities must be []
- put 5-6 bullets only in achievements
- every bullet must include what was done and how it improved, with at least one numeric value (e.g. 28%, 2x, 37ms, $500K)
- no Key Responsibilities / Key Achievements wording or split
- formula: action verb → ownership/scope → technologies → numeric improvement`;

export function prepareResumeGenerationInstructions(
  userInstructions: string,
  resumeJsonSchema?: Record<string, unknown>,
): string {
  const parts = [
    cleanText(userInstructions),
    EXPERIENCE_BULLET_RULES,
    RESUME_ONLY_NOTICE,
  ];

  if (resumeJsonSchema) {
    parts.push(
      `You must respond with valid JSON only, matching this schema exactly:\n${JSON.stringify(resumeJsonSchema)}`,
    );
  }

  return parts.join('\n\n');
}
