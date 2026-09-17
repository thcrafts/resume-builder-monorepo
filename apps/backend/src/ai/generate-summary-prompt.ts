import { SUMMARY_SKILL_MENTION_LIMIT } from '@resume-builder/shared';
import { cleanText } from './clean-text';

export function buildSummaryChunkUserPrompt(options: {
  jobContext: string;
  finalTitle: string;
  companySummaries: string[];
  yearsOfExperience?: number | null;
  mandatorySkills?: string[];
  keyModernSkills?: string[];
  mandatoryExperience?: string[];
  userInstructions?: string;
}): string {
  const parts = [
    `Job Context:\n${cleanText(options.jobContext)}`,
    `Resume Title: ${options.finalTitle}`,
    `Companies:\n${options.companySummaries.join('\n')}`,
  ];

  if (options.yearsOfExperience != null) {
    parts.push(
      `Years of experience (MANDATORY — use exactly this number): ${options.yearsOfExperience}+ years of experience`,
    );
  }

  parts.push(
    'Length: 4–5 sentences, 100–120 words. Do not go below 100 words or above 120 words.',
  );

  const mandatorySkills = options.mandatorySkills ?? [];
  if (mandatorySkills.length > 0) {
    parts.push(
      `Mandatory JD skills to INCLUDE (name them in the real-project story; ADD with modern skillsets; do not dump a list): ${mandatorySkills.join(', ')}`,
    );
  }

  const mandatoryExperience = options.mandatoryExperience ?? [];
  if (mandatoryExperience.length > 0) {
    parts.push(
      `Mandatory JD experience to INCLUDE (years, seniority, domain/themes — reflect realistically): ${mandatoryExperience.join('; ')}`,
    );
  }

  const modernToMention = (options.keyModernSkills ?? []).slice(
    0,
    SUMMARY_SKILL_MENTION_LIMIT,
  );
  if (modernToMention.length > 0) {
    parts.push(
      `Candidate modern skillsets to ADD with that story: ${modernToMention.join(', ')}`,
    );
  }

  if (options.userInstructions?.trim()) {
    parts.push(
      `Additional Instructions:\n${cleanText(options.userInstructions)}`,
    );
  }

  return parts.join('\n\n');
}
