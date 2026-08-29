import * as React from "react";
import { Code } from "lucide-react";
import {
  FALLBACK_CATALOG,
  getCompactModelVersionLabel,
  normalizeModelSelection,
} from "../../constants/aiModels";
import { useAiModels } from "../common/AiModelsContext";
import ModelProviderIcon from "../common/ModelProviderIcon";
import { Badge } from "../ui/misc";

interface AiVersionBadgeProps {
  aiModel?: string;
  aiVersion?: string;
  generationSource?: "ai" | "manual";
}

const AiVersionBadge: React.FC<AiVersionBadgeProps> = ({
  aiModel,
  aiVersion,
  generationSource,
}) => {
  const { catalog } = useAiModels();
  const activeCatalog = catalog.providers.length > 0 ? catalog : FALLBACK_CATALOG;
  const normalized = normalizeModelSelection(
    aiModel,
    aiVersion,
    activeCatalog,
  );
  const versionLabel = getCompactModelVersionLabel(
    activeCatalog,
    normalized.aiModel,
    normalized.aiVersion,
  );

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      {generationSource === "manual" ? (
        <Code className="h-3.5 w-3.5" />
      ) : (
        <ModelProviderIcon modelId={normalized.aiVersion} size={16} />
      )}
      {versionLabel}
    </Badge>
  );
};

export default AiVersionBadge;
