import * as React from "react";
import { Link } from "react-router";
import {
  getVersionsForProvider,
  resolveModelSelectionInCatalog,
} from "../../constants/aiModels";
import { getApiKeyWarning } from "../../constants/profileWarnings";
import { useAiModels } from "../common/AiModelsContext";
import ModelProviderIcon from "../common/ModelProviderIcon";
import { getProfile, type UserResponse } from "../../services/userService";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Alert, Select, Spinner } from "../ui/misc";

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
  const [profile, setProfile] = React.useState<UserResponse | null>(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const resolved = resolveModelSelectionInCatalog(aiModel, aiVersion, catalog);
  const providers = catalog.providers;
  const versions = getVersionsForProvider(catalog, resolved.aiModel);
  const selectedVersion = resolved.aiVersion;
  const apiKeyWarning = getApiKeyWarning(profile);

  React.useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {
        setProfile(null);
      })
      .finally(() => {
        setProfileLoaded(true);
      });
  }, []);

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
      <div className="mt-1 flex items-center gap-2 pt-1">
        <Spinner className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-2 pt-1">
      {error && profileLoaded && apiKeyWarning ? (
        <Alert variant="warning" className="flex items-center justify-between gap-3">
          <span>{apiKeyWarning}</span>
          <Link to="/settings">
            <Button type="button" variant="outline" size="sm">
              Go to Settings
            </Button>
          </Link>
        </Alert>
      ) : error && profileLoaded && !apiKeyWarning ? (
        <p className="text-sm text-primary">{error}. Showing limited model list.</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[200px] shrink-0 space-y-1.5">
          <Label htmlFor="ai-model">Model</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <ModelProviderIcon
                modelId={selectedVersion}
                provider={resolved.aiModel}
              />
            </span>
            <Select
              id="ai-model"
              className="pl-8"
              value={resolved.aiModel}
              disabled={disabled || providers.length === 0}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="w-[280px] shrink-0 space-y-1.5">
          <Label htmlFor="ai-version">Version</Label>
          <Select
            id="ai-version"
            value={selectedVersion}
            disabled={disabled || versions.length === 0}
            onChange={(e) => onChange(resolved.aiModel, e.target.value)}
          >
            {versions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.versionLabel}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AiModelSelector;
