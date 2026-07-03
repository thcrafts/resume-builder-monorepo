import * as React from "react";
import { Chip } from "@mui/material";
import { Code as CodeIcon } from "@mui/icons-material";
import {
  FALLBACK_CATALOG,
  getCompactModelVersionLabel,
  normalizeModelSelection,
} from "../../constants/aiModels";
import { useAiModels } from "../common/AiModelsContext";
import ModelProviderIcon from "../common/ModelProviderIcon";
import { chipWithIconSx } from "../../styles/chipWithIcon";

interface AiVersionBadgeProps {
  aiModel?: string;
  aiVersion?: string;
  generationSource?: "ai" | "manual";
}

const chipSx = chipWithIconSx;

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

  if (generationSource === "manual") {
    return (
      <Chip
        size="small"
        variant="outlined"
        icon={<CodeIcon sx={{ fontSize: 16, mr: 0 }} />}
        label={versionLabel}
        sx={{
          ...chipWithIconSx,
          "& .MuiChip-icon": {
            marginLeft: 0,
            marginRight: 0,
          },
          "& .MuiChip-icon svg": {
            marginRight: 0,
          },
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      variant="outlined"
      icon={<ModelProviderIcon provider={normalized.aiModel} size={16} />}
      label={versionLabel}
      sx={chipSx}
    />
  );
};

export default AiVersionBadge;
