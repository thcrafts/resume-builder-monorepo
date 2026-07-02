import { Injectable } from '@nestjs/common';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 60 * 60 * 1000;

const PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'google',
  'meta-llama',
  'mistralai',
  'deepseek',
  'x-ai',
  'qwen',
  'cohere',
  'perplexity',
  'microsoft',
  'nvidia',
  'amazon',
];

const DEFAULT_AI_MODEL = 'anthropic';
const DEFAULT_AI_VERSION = 'anthropic/claude-sonnet-4.6';
const DEFAULT_FROM_JSON_AI_MODEL = 'openai';
const DEFAULT_FROM_JSON_AI_VERSION = 'openai/gpt-5.2';

export interface AiModelOptionDto {
  id: string;
  label: string;
  versionLabel: string;
}

export interface AiProviderDto {
  id: string;
  label: string;
  models: AiModelOptionDto[];
}

export interface AiModelCatalogDto {
  providers: AiProviderDto[];
  defaults: {
    aiModel: string;
    aiVersion: string;
    fromJsonAiModel: string;
    fromJsonAiVersion: string;
  };
}

type OpenRouterModel = {
  id: string;
  name: string;
  architecture?: {
    output_modalities?: string[];
  };
};

@Injectable()
export class OpenRouterModelsService {
  private cache: { catalog: AiModelCatalogDto; fetchedAt: number } | null = null;

  async getCatalog(): Promise<AiModelCatalogDto> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.catalog;
    }

    const response = await fetch(OPENROUTER_MODELS_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch models from OpenRouter');
    }

    const body = (await response.json()) as { data?: OpenRouterModel[] };
    const catalog = this.buildCatalog(body.data ?? []);
    this.cache = { catalog, fetchedAt: Date.now() };
    return catalog;
  }

  private buildCatalog(models: OpenRouterModel[]): AiModelCatalogDto {
    const grouped = new Map<string, AiModelOptionDto[]>();

    for (const model of models) {
      if (!model.id.includes('/') || model.id.startsWith('~')) {
        continue;
      }

      const outputsText =
        model.architecture?.output_modalities?.includes('text') ?? true;
      if (!outputsText) {
        continue;
      }

      const [providerId] = model.id.split('/');
      if (!providerId || providerId.startsWith('~')) {
        continue;
      }

      const modelsForProvider = grouped.get(providerId) ?? [];
      modelsForProvider.push({
        id: model.id,
        label: model.name,
        versionLabel: this.getVersionLabel(model),
      });
      grouped.set(providerId, modelsForProvider);
    }

    const providers: AiProviderDto[] = [...grouped.entries()]
      .map(([id, providerModels]) => ({
        id,
        label: this.getProviderLabel(id, providerModels),
        models: providerModels.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
        ),
      }))
      .sort((a, b) => {
        const aIndex = PROVIDER_ORDER.indexOf(a.id);
        const bIndex = PROVIDER_ORDER.indexOf(b.id);
        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        }
        return a.label.localeCompare(b.label);
      });

    return {
      providers,
      defaults: {
        aiModel: DEFAULT_AI_MODEL,
        aiVersion: this.pickDefaultVersion(
          providers,
          DEFAULT_AI_MODEL,
          DEFAULT_AI_VERSION,
        ),
        fromJsonAiModel: DEFAULT_FROM_JSON_AI_MODEL,
        fromJsonAiVersion: this.pickDefaultVersion(
          providers,
          DEFAULT_FROM_JSON_AI_MODEL,
          DEFAULT_FROM_JSON_AI_VERSION,
        ),
      },
    };
  }

  private pickDefaultVersion(
    providers: AiProviderDto[],
    providerId: string,
    preferredId: string,
  ): string {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider || provider.models.length === 0) {
      return preferredId;
    }

    const preferred = provider.models.find((model) => model.id === preferredId);
    return preferred?.id ?? provider.models[0].id;
  }

  private getProviderLabel(
    providerId: string,
    models: AiModelOptionDto[],
  ): string {
    const fromName = models[0]?.label.match(/^([^:]+):/);
    if (fromName?.[1]) {
      return fromName[1].trim();
    }

    return providerId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private getVersionLabel(model: OpenRouterModel): string {
    const colonIndex = model.name.indexOf(':');
    if (colonIndex >= 0) {
      return model.name.slice(colonIndex + 1).trim();
    }

    const slashIndex = model.id.indexOf('/');
    return slashIndex >= 0 ? model.id.slice(slashIndex + 1) : model.id;
  }
}
