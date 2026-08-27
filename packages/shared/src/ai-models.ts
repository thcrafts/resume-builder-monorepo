const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: 'anthropic',
  openai: 'openai',
};

export const DEFAULT_AI_MODEL = 'anthropic';
export const DEFAULT_AI_VERSION = 'anthropic/claude-sonnet-4.6';
export const DEFAULT_FROM_JSON_AI_MODEL = 'openai';
export const DEFAULT_FROM_JSON_AI_VERSION = 'openai/gpt-5.2';

export function resolveApiModelId(aiModel: string, aiVersion: string): string {
  if (aiVersion.includes('/')) {
    return aiVersion;
  }

  const provider = LEGACY_PROVIDER_MAP[aiModel] ?? aiModel;
  return `${provider}/${aiVersion}`;
}

export { LEGACY_PROVIDER_MAP };
