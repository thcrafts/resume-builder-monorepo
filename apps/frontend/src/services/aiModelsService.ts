import ApiClient from "./apiClient";

export interface AiModelOption {
  id: string;
  label: string;
  versionLabel: string;
}

export interface AiProviderOption {
  id: string;
  label: string;
  models: AiModelOption[];
}

export interface AiModelCatalog {
  providers: AiProviderOption[];
  defaults: {
    aiModel: string;
    aiVersion: string;
    fromJsonAiModel: string;
    fromJsonAiVersion: string;
  };
}

const api = ApiClient.getInstance();

export const getAiModels = async (): Promise<AiModelCatalog> => {
  const res = await api.get<AiModelCatalog>("/api/ai/models");
  return res.data;
};
