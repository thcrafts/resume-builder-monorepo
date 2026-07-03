import type { AiModelCatalog, AiProviderOption, AiModelOption } from "../services/aiModelsService";

const LEGACY_PROVIDER_MAP: Record<string, string> = {
  claude: "anthropic",
  openai: "openai",
};

const MODEL_FAMILY_PREFIXES: Record<string, string[]> = {
  anthropic: ["Anthropic", "Claude"],
  openai: ["OpenAI", "ChatGPT", "GPT"],
  google: ["Google", "Gemini"],
  meta: ["Meta", "Llama"],
  "meta-llama": ["Meta", "Llama"],
  mistralai: ["Mistral"],
  mistral: ["Mistral"],
  deepseek: ["DeepSeek"],
  cohere: ["Cohere", "Command"],
  perplexity: ["Perplexity"],
  qwen: ["Qwen", "Alibaba"],
  "x-ai": ["xAI", "Grok"],
  xai: ["xAI", "Grok"],
  microsoft: ["Microsoft", "Phi"],
  nvidia: ["NVIDIA"],
  amazon: ["Amazon", "Nova", "AWS"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingModelPrefix(label: string, prefixes: string[]): string {
  let compact = label.trim();

  for (const prefix of prefixes) {
    if (!prefix.trim()) {
      continue;
    }

    const pattern = new RegExp(`^${escapeRegExp(prefix.trim())}(?:[\\s-]+|:)`, "i");
    if (pattern.test(compact)) {
      compact = compact.replace(pattern, "").trim();
      break;
    }
  }

  return compact || label.trim();
}

function getCompactPrefixes(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
): string[] {
  const normalizedProvider = providerId.toLowerCase();
  const mappedProvider =
    LEGACY_PROVIDER_MAP[normalizedProvider] ?? normalizedProvider;
  const providerLabel = getProviderLabel(catalog, providerId);

  return [
    ...new Set(
      [
        ...(MODEL_FAMILY_PREFIXES[mappedProvider] ?? []),
        ...(MODEL_FAMILY_PREFIXES[normalizedProvider] ?? []),
        providerLabel,
      ].filter(Boolean),
    ),
  ];
}

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

function normalizeModelSlug(value: string): string {
  const withoutProvider = value.includes("/")
    ? value.split("/").slice(1).join("/")
    : value;

  return withoutProvider
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/_/g, "-")
    .replace(/-+/g, "-");
}

function findCatalogModelMatch(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
  candidateId: string,
): AiModelOption | undefined {
  const models = getVersionsForProvider(catalog, providerId);
  if (models.length === 0) {
    return undefined;
  }

  const exact = models.find((model) => model.id === candidateId);
  if (exact) {
    return exact;
  }

  const candidateSlug = normalizeModelSlug(candidateId);
  return models.find((model) => normalizeModelSlug(model.id) === candidateSlug);
}

export function resolveModelSelectionInCatalog(
  aiModel?: string,
  aiVersion?: string,
  catalog?: AiModelCatalog | null,
): { aiModel: string; aiVersion: string } {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  const defaults = catalog?.defaults ?? FALLBACK_CATALOG.defaults;
  const match = findCatalogModelMatch(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );

  if (match) {
    return {
      aiModel: normalized.aiModel,
      aiVersion: match.id,
    };
  }

  const providerModels = getVersionsForProvider(catalog, normalized.aiModel);
  if (providerModels.length > 0) {
    return {
      aiModel: normalized.aiModel,
      aiVersion: providerModels[0].id,
    };
  }

  return {
    aiModel: normalized.aiModel || defaults.aiModel,
    aiVersion: normalized.aiVersion || defaults.aiVersion,
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

/** First catalog model id for a provider — used when only provider slug is known (filter chips). */
export function getRepresentativeModelIdForProvider(
  catalog: AiModelCatalog | null | undefined,
  providerId: string,
): string {
  return getVersionsForProvider(catalog, providerId)[0]?.id ?? providerId;
}

export function getModelOption(
  catalog: AiModelCatalog | null | undefined,
  aiVersion: string,
  aiModel?: string,
) {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  return findCatalogModelMatch(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );
}

export function getModelVersionLabel(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string,
  aiVersion: string,
): string {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  const match = getModelOption(
    catalog,
    normalized.aiVersion,
    normalized.aiModel,
  );
  if (match) {
    return match.versionLabel;
  }

  const slashIndex = normalized.aiVersion.indexOf("/");
  return slashIndex >= 0
    ? normalized.aiVersion.slice(slashIndex + 1)
    : normalized.aiVersion;
}

export function getCompactModelVersionLabel(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string,
  aiVersion: string,
): string {
  const normalized = normalizeModelSelection(aiModel, aiVersion, catalog);
  const versionLabel = getModelVersionLabel(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );

  return stripLeadingModelPrefix(
    versionLabel,
    getCompactPrefixes(catalog, normalized.aiModel),
  );
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
  const match = findCatalogModelMatch(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );
  const aiVersion = match?.id ?? models[0]?.id ?? defaults.aiVersion;

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
  const match = findCatalogModelMatch(
    catalog,
    normalized.aiModel,
    normalized.aiVersion,
  );
  const aiVersion = match?.id ?? models[0]?.id ?? defaults.fromJsonAiVersion;

  return {
    aiModel: normalized.aiModel,
    aiVersion,
  };
}

export function getAiVersionDisplay(
  catalog: AiModelCatalog | null | undefined,
  aiModel: string | undefined,
  aiVersion: string | undefined,
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
