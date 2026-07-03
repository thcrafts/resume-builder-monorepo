const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: 'anthropic',
  openai: 'openai',
};

export function resolveApiModelId(aiModel: string, aiVersion: string): string {
  if (aiVersion.includes('/')) {
    return aiVersion;
  }

  const provider = LEGACY_PROVIDER_MAP[aiModel] ?? aiModel;
  return `${provider}/${aiVersion}`;
}
