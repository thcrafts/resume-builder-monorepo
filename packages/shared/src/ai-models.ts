const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: 'anthropic',
  openai: 'openai',
};

export const DEFAULT_TITLE_MATCH_MODEL = 'openai/gpt-4o-mini';
/** Dedicated cheap pass to extract JD skills/experience for company alignment. */
export const DEFAULT_JD_EXTRACTION_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_SUMMARY_MODEL = 'anthropic/claude-sonnet-4.6';
export const DEFAULT_SKILLS_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_EXPERIENCE_MODEL = 'openai/gpt-5.4-mini';
export const EXPERIENCE_MODEL_FALLBACK = 'openai/gpt-4o-mini';
/** Cheap pass to normalize messy company experience skill lists. */
export const DEFAULT_EXPERIENCE_SKILLS_MODEL = 'openai/gpt-4o-mini';

export const TITLE_MATCH_MAX_TOKENS = 256;
export const JD_EXTRACTION_MAX_TOKENS = 1024;
export const JOB_POSTING_EXTRACT_MAX_TOKENS = 2048;
export const SUMMARY_MAX_TOKENS = 512;
/** Target professional summary length is 100–120 words; this is the hard cap. */
export const SUMMARY_MAX_WORDS = 120;
/** How many JD / modern skill names the summary should try to mention. */
export const SUMMARY_SKILL_MENTION_LIMIT = 6;
export const SKILLS_MAX_TOKENS = 4096;
export const EXPERIENCE_MAX_TOKENS = 2048;
export const EXPERIENCE_SKILLS_MAX_TOKENS = 512;

export const EXPERIENCE_CONCURRENCY_LIMIT = 2;
/** Soft cap: how many AI resume jobs a user may run at once. */
export const MAX_CONCURRENT_RESUME_GENERATIONS = 8;
/** Full JD excerpt only for the most recent company (saves tokens on older roles). */
export const JD_MOST_RECENT_EXCERPT_CHARS = 2500;
/** Truncated JD for cheap title-match step. */
export const JD_TITLE_MATCH_CHARS = 2000;
/** Short JD excerpt paired with extracted alignment for summary. */
export const JD_SUMMARY_EXCERPT_CHARS = 1200;
export const JD_EXPERIENCE_TRUNCATE_CHARS = 8000;

export function resolveApiModelId(aiModel: string, aiVersion: string): string {
  if (aiVersion.includes('/')) {
    return aiVersion;
  }

  const provider = LEGACY_PROVIDER_MAP[aiModel] ?? aiModel;
  return `${provider}/${aiVersion}`;
}

export { LEGACY_PROVIDER_MAP };
