import type { ResumeData } from 'src/resumes/templates';
import { MAX_EXPERIENCE_BULLETS_PER_ROLE } from './resume-settings';
import { DEFAULT_RESUME_SETTINGS, normalizeTechStackSkills } from '@resume-builder/shared';
import {
  coerceToPlainText,
  isUsableExperienceBullet,
} from './schemas/experience.schema';

export const MAX_WORDS_PER_EXPERIENCE_BULLET = 28;

const DANGLING_TRAILING_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'by',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'with',
  'from',
  'as',
  'via',
  'into',
  'over',
  'under',
  'than',
]);

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

function trimDanglingTrailingWords(words: string[]): string[] {
  const next = [...words];
  while (next.length > 0) {
    const last = next[next.length - 1].replace(/[.,;:!?]+$/g, '').toLowerCase();
    if (!DANGLING_TRAILING_WORDS.has(last)) {
      break;
    }
    next.pop();
  }
  return next;
}

export function normalizeExperienceBullet(text: unknown): string {
  let normalized = coerceToPlainText(text);
  if (!normalized || normalized === '[object Object]') {
    return '';
  }

  normalized = normalized.replace(/^\s*-\s+/, '');
  normalized = normalized.replace(/\s+-\s+/g, ', ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  if (!isUsableExperienceBullet(normalized)) {
    return '';
  }

  let words = normalized.split(' ').filter(Boolean);
  if (words.length > MAX_WORDS_PER_EXPERIENCE_BULLET) {
    words = trimDanglingTrailingWords(
      words.slice(0, MAX_WORDS_PER_EXPERIENCE_BULLET),
    );
    if (words.length < 6) {
      return '';
    }
    normalized = words.join(' ');
  }

  return ensureSentenceEnding(normalized);
}

function mergeRoleBullets(
  responsibilities: unknown[],
  achievements: unknown[],
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
  companySkillsCount = 0,
  options?: { preserveCompanySkills?: boolean },
): ResumeData {
  if (!Array.isArray(resumeJson.experience)) {
    return resumeJson;
  }

  const effectiveMaxBullets =
    maxBulletsPerRole > 0
      ? maxBulletsPerRole
      : DEFAULT_RESUME_SETTINGS.achievementsCount;

  return {
    ...resumeJson,
    experience: resumeJson.experience.map((entry) => {
      const responsibilities = Array.isArray(entry.responsibilities)
        ? entry.responsibilities
        : [];
      const achievements = Array.isArray(entry.achievements)
        ? entry.achievements
        : [];
      const skills = Array.isArray(entry.skills) ? entry.skills : [];
      const plainSkills = normalizeTechStackSkills(
        skills.map((skill) => coerceToPlainText(skill)).filter(Boolean),
      );
      const trimmedSkills =
        options?.preserveCompanySkills || companySkillsCount <= 0
          ? plainSkills
          : plainSkills.slice(0, companySkillsCount);

      return {
        ...entry,
        responsibilities: [],
        achievements: mergeRoleBullets(
          responsibilities,
          achievements,
          effectiveMaxBullets,
        ),
        skills: trimmedSkills,
      };
    }),
  };
}