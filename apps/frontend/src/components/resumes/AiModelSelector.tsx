import * as React from "react";
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  getProviderLabel,
  getVersionsForProvider,
  getRepresentativeModelIdForProvider,
  resolveModelSelectionInCatalog,
} from "../../constants/aiModels";
import { useAiModels } from "../common/AiModelsContext";
import ModelProviderIcon from "../common/ModelProviderIcon";

interface AiModelSelectorProps {
  aiModel: string;
  aiVersion: string;
  onChange: (aiModel: string, aiVersion: string) => void;
  disabled?: boolean;
}

const AiModelSelector: React.FC<AiModelSelectorProps> = ({
  aiModel,
  aiVersion,
  onChange,
  disabled = false,
}) => {
  const { catalog, loading, error } = useAiModels();
  const resolved = resolveModelSelectionInCatalog(aiModel, aiVersion, catalog);
  const providers = catalog.providers;
  const versions = getVersionsForProvider(catalog, resolved.aiModel);
  const selectedVersion = resolved.aiVersion;

  const handleModelChange = (newProvider: string) => {
    const providerVersions = getVersionsForProvider(catalog, newProvider);
    const keepCurrent = providerVersions.some(
      (model) => model.id === selectedVersion,
    );
    const nextVersion = keepCurrent
      ? selectedVersion
      : providerVersions[0]?.id ?? resolved.aiVersion;
    onChange(newProvider, nextVersion);
  };

  if (loading && providers.length === 0) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, pt: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading models...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ mt: 1, pt: 1 }}>
      {error && (
        <Typography variant="body2" color="warning.main">
          {error}. Showing limited model list.
        </Typography>
      )}
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl
          size="small"
          disabled={disabled || providers.length === 0}
          sx={{ width: 200, flexShrink: 0 }}
        >
          <InputLabel id="ai-model-label">Model</InputLabel>
          <Select
            labelId="ai-model-label"
            label="Model"
            value={resolved.aiModel}
            onChange={(e) => handleModelChange(e.target.value)}
            renderValue={(value) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <ModelProviderIcon modelId={selectedVersion} provider={value} />
                {getProviderLabel(catalog, value)}
              </Box>
            )}
          >
            {providers.map((provider) => (
              <MenuItem key={provider.id} value={provider.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <ModelProviderIcon
                    modelId={getRepresentativeModelIdForProvider(
                      catalog,
                      provider.id,
                    )}
                  />
                  {provider.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          disabled={disabled || versions.length === 0}
          sx={{ width: 280, flexShrink: 0 }}
        >
          <InputLabel id="ai-version-label">Version</InputLabel>
          <Select
            labelId="ai-version-label"
            label="Version"
            value={selectedVersion}
            onChange={(e) => onChange(resolved.aiModel, e.target.value)}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 360 },
              },
            }}
          >
            {versions.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <ModelProviderIcon modelId={model.id} />
                  {model.versionLabel}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
};

export default AiModelSelector;
