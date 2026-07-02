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

export function normalizeModelSelection(
  aiModel?: string,
  aiVersion?: string,
): { aiModel: string; aiVersion: string } {
  const model = aiModel?.trim() || 'anthropic';
  const version = aiVersion?.trim() || 'anthropic/claude-sonnet-4.6';
  const resolvedVersion = resolveApiModelId(model, version);
  const provider = resolvedVersion.split('/')[0] || model;

  return {
    aiModel: provider,
    aiVersion: resolvedVersion,
  };
}
