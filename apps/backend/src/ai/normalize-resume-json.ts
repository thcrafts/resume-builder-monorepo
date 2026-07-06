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

function trimRoleBulletsToMax(
  responsibilities: string[],
  achievements: string[],
  maxBullets: number,
): { responsibilities: string[]; achievements: string[] } {
  let resp = responsibilities.map(normalizeExperienceBullet).filter(Boolean);
  let ach = achievements.map(normalizeExperienceBullet).filter(Boolean);

  while (resp.length + ach.length > maxBullets) {
    if (ach.length > 0) {
      ach = ach.slice(0, -1);
      continue;
    }
    if (resp.length > 0) {
      resp = resp.slice(0, -1);
      continue;
    }
    break;
  }

  return { responsibilities: resp, achievements: ach };
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

      const trimmed = trimRoleBulletsToMax(
        responsibilities,
        achievements,
        maxBulletsPerRole,
      );

      return {
        ...entry,
        responsibilities: trimmed.responsibilities,
        achievements: trimmed.achievements,
      };
    }),
  };
}
