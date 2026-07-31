import type { ResumeData } from 'src/resumes/templates';
import { MAX_EXPERIENCE_BULLETS_PER_ROLE } from './resume-settings';

export const MAX_WORDS_PER_EXPERIENCE_BULLET = 28;

export function ensureSentenceEnding(text: string): string {
  let result = text.replace(/[,;:\s]+$/, '').trim();
  if (!result) {
    return result;
  }
  if (!/[.!?]$/.test(result)) {
    result += '.';
  }
  return result;
}

export function normalizeExperienceBullet(text: string): string {
  let normalized = String(text ?? '').trim();
  normalized = normalized.replace(/^\s*-\s+/, '');
  normalized = normalized.replace(/\s+-\s+/g, ', ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > MAX_WORDS_PER_EXPERIENCE_BULLET) {
    normalized = words.slice(0, MAX_WORDS_PER_EXPERIENCE_BULLET).join(' ');
  }

  return ensureSentenceEnding(normalized);
}

function mergeRoleBullets(
  responsibilities: string[],
  achievements: string[],
  maxBullets: number,
): string[] {
  const merged = [...responsibilities, ...achievements]
    .map(normalizeExperienceBullet)
    .filter(Boolean);

  return merged.slice(0, maxBullets);
}

export function normalizeResumeExperienceBullets(
  resumeJson: ResumeData,
  maxBulletsPerRole: number = MAX_EXPERIENCE_BULLETS_PER_ROLE,
): ResumeData {
  if (!Array.isArray(resumeJson.experience)) {
    return resumeJson;
  }

  return {
    ...resumeJson,
    experience: resumeJson.experience.map((entry) => {
      const responsibilities = Array.isArray(entry.responsibilities)
        ? entry.responsibilities
        : [];
      const achievements = Array.isArray(entry.achievements)
        ? entry.achievements
        : [];

      return {
        ...entry,
        responsibilities: [],
        achievements: mergeRoleBullets(
          responsibilities,
          achievements,
          maxBulletsPerRole,
        ),
      };
    }),
  };
}
