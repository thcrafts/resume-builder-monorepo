import { cleanText } from './clean-text';

const RESUME_ONLY_NOTICE = `IMPORTANT: Return only the resume JSON object. Do not include cover_letter or any cover letter text. Cover letters are generated separately on demand.`;

export function prepareResumeGenerationInstructions(
  userInstructions: string,
  resumeJsonSchema?: Record<string, unknown>,
): string {
  const parts = [cleanText(userInstructions), RESUME_ONLY_NOTICE];

  if (resumeJsonSchema) {
    parts.push(
      `You must respond with valid JSON only, matching this schema exactly:\n${JSON.stringify(resumeJsonSchema)}`,
    );
  }

  return parts.join('\n\n');
}
