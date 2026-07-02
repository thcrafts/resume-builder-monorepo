import * as React from "react";
import { getAiModels, type AiModelCatalog } from "../../services/aiModelsService";
import { FALLBACK_CATALOG } from "../../constants/aiModels";

interface AiModelsContextValue {
  catalog: AiModelCatalog;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AiModelsContext = React.createContext<AiModelsContextValue | null>(null);

export const AiModelsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [catalog, setCatalog] = React.useState<AiModelCatalog>(FALLBACK_CATALOG);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextCatalog = await getAiModels();
      setCatalog(nextCatalog);
    } catch {
      setError("Failed to load AI models");
      setCatalog(FALLBACK_CATALOG);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(
    () => ({
      catalog,
      loading,
      error,
      refresh,
    }),
    [catalog, loading, error, refresh],
  );

  return (
    <AiModelsContext.Provider value={value}>{children}</AiModelsContext.Provider>
  );
};

export const useAiModels = (): AiModelsContextValue => {
  const context = React.useContext(AiModelsContext);
  if (!context) {
    throw new Error("useAiModels must be used within AiModelsProvider");
  }
  return context;
};
