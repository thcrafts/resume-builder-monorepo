import {
  DEFAULT_QUESTIONS_PROMPT,
  QUESTIONS_VOICE_OVERLAY,
} from '@resume-builder/shared';
import { cleanText } from './clean-text';

export function buildQuestionsSystemInstructions(options: {
  customPrompt?: string;
  jobDescription: string;
  resumeJson: Record<string, unknown>;
}): string {
  const prompt = cleanText(
    options.customPrompt?.trim() || DEFAULT_QUESTIONS_PROMPT,
  );

  const resumeCopy: Record<string, unknown> = { ...(options.resumeJson || {}) };
  if (resumeCopy.cover_letter) {
    delete resumeCopy.cover_letter;
  }

  return [
    prompt,
    QUESTIONS_VOICE_OVERLAY,
    `Job description:\n${cleanText(options.jobDescription)}`,
    `Resume:\n${JSON.stringify(resumeCopy)}`,
  ].join('\n\n');
}
