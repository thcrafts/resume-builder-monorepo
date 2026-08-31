const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: 'anthropic',
  openai: 'openai',
};

export const DEFAULT_AI_MODEL = 'anthropic';
export const DEFAULT_AI_VERSION = 'anthropic/claude-sonnet-4.6';
export const DEFAULT_FROM_JSON_AI_MODEL = 'openai';
export const DEFAULT_FROM_JSON_AI_VERSION = 'openai/gpt-5.2';

export const DEFAULT_TITLE_MATCH_MODEL = 'openai/gpt-4o-mini';
/** Dedicated cheap pass to extract JD skills/experience for company alignment. */
export const DEFAULT_JD_EXTRACTION_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_SUMMARY_MODEL = 'anthropic/claude-sonnet-4.6';
export const DEFAULT_SKILLS_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_EXPERIENCE_MODEL = 'openai/gpt-5.4-mini';
export const EXPERIENCE_MODEL_FALLBACK = 'openai/gpt-4o-mini';

export const TITLE_MATCH_MAX_TOKENS = 256;
export const JD_EXTRACTION_MAX_TOKENS = 512;
export const SUMMARY_MAX_TOKENS = 512;
export const SKILLS_MAX_TOKENS = 4096;
export const EXPERIENCE_MAX_TOKENS = 2048;

export const EXPERIENCE_CONCURRENCY_LIMIT = 3;
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
