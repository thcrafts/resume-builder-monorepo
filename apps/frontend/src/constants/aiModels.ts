import type { AiModelCatalog, AiProviderOption } from "../services/aiModelsService";

const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: "anthropic",
  openai: "openai",
};

export const FALLBACK_CATALOG: AiModelCatalog = {
  providers: [],
  defaults: {
    aiModel: "anthropic",
    aiVersion: "anthropic/claude-sonnet-4.6",
    fromJsonAiModel: "openai",
    fromJsonAiVersion: "openai/gpt-5.2",
  },
};

export function resolveApiModelId(aiModel: string, aiVersion: string): string {
  if (aiVersion.includes("/")) {
    return aiVersion;
  }

  const provider = LEGACY_PROVIDER_MAP[aiModel] ?? aiModel;
  return `${provider}/${aiVersion}`;
}

export function normalizeModelSelection(
  aiModel?: string,
  aiVersion?: string,
  catalog?: AiModelCatalog | null,
): { aiModel: string; aiVersion: string } {
  const defaults = catalog?.defaults ?? FALLBACK_CATALOG.defaults;
  const model = aiModel?.trim() || defaults.aiModel;
  const version = aiVersion?.trim() || defaults.aiVersion;
  const resolvedVersion = resolveApiModelId(model, version);
  const provider = resolvedVersion.split("/")[0] || model;

  return {
    aiModel: provider,
    aiVersion: resolvedVersion,
  };
}

export function getProvider(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
): AiProviderOption | undefined {
  return catalog?.providers.find((provider) => provider.id === providerId);
}

export function getVersionsForProvider(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
) {
  return getProvider(catalog, providerId)?.models ?? [];
}

export function getModelOption(
  catalog: AiModelCatalog | null | undefined,
  aiVersion: string,
) {
  const resolved = resolveApiModelId("", aiVersion);
  const providerId = resolved.split("/")[0];
  return getVersionsForProvider(catalog, providerId).find(
    (model) => model.id === resolved,
  );
}

export function getModelLabel(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string,
  aiVersion: string,
): string {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  const match = getModelOption(catalog, normalized.aiVersion);
  if (match) {
    return match.label;
  }

  return normalized.aiVersion;
}

export function getModelVersionLabel(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string,
  aiVersion: string,
): string {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  const match = getModelOption(catalog, normalized.aiVersion);
  if (match) {
    return match.versionLabel;
  }

  const slashIndex = normalized.aiVersion.indexOf("/");
  return slashIndex >= 0
    ? normalized.aiVersion.slice(slashIndex + 1)
    : normalized.aiVersion;
}

export function getProviderLabel(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
): string {
  return getProvider(catalog, providerId)?.label ?? providerId;
}

export function resolveUserDefaultAi(
  profile?: {
    defaultAiModel?: string;
    defaultAiVersion?: string;
  } | null,
  catalog?: AiModelCatalog | null,
): { aiModel: string; aiVersion: string } {
  const defaults = catalog?.defaults ?? FALLBACK_CATALOG.defaults;
  const normalized = normalizeModelSelection(
    profile?.defaultAiModel,
    profile?.defaultAiVersion,
    catalog,
  );

  const models = getVersionsForProvider(catalog, normalized.aiModel);
  const candidate = normalized.aiVersion;
  const aiVersion = models.some((model) => model.id === candidate)
    ? candidate
    : models[0]?.id ?? defaults.aiVersion;

  return {
    aiModel: normalized.aiModel,
    aiVersion,
  };
}

export function resolveUserDefaultFromJsonAi(
  profile?: {
    defaultFromJsonAiModel?: string;
    defaultFromJsonAiVersion?: string;
  } | null,
  catalog?: AiModelCatalog | null,
): { aiModel: string; aiVersion: string } {
  const defaults = catalog?.defaults ?? FALLBACK_CATALOG.defaults;
  const normalized = normalizeModelSelection(
    profile?.defaultFromJsonAiModel ?? defaults.fromJsonAiModel,
    profile?.defaultFromJsonAiVersion ?? defaults.fromJsonAiVersion,
    catalog,
  );

  const models = getVersionsForProvider(catalog, normalized.aiModel);
  const candidate = normalized.aiVersion;
  const aiVersion = models.some((model) => model.id === candidate)
    ? candidate
    : models[0]?.id ?? defaults.fromJsonAiVersion;

  return {
    aiModel: normalized.aiModel,
    aiVersion,
  };
}

export function getAiVersionDisplay(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string | undefined,
  aiVersion: string | undefined,
  generationSource?: "ai" | "manual",
): string {
  const normalized = normalizeModelSelection(
    aiModel,
    aiVersion,
    catalog,
  );
  const label = getModelVersionLabel(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );

  return label;
}

export type { AiProviderOption };
