import * as React from "react";
import { ModelIcon } from "@lobehub/icons";

interface ModelProviderIconProps {
  /** Full OpenRouter model id (e.g. anthropic/claude-sonnet-4.6, amazon/nova-pro-v1). */
  modelId?: string;
  /** Fallback when modelId is unavailable (provider slug only). */
  provider?: string;
  size?: number;
}

const ModelProviderIcon: React.FC<ModelProviderIconProps> = ({
  modelId,
  provider,
  size = 16,
}) => {
  const model = modelId?.trim() || provider?.trim() || "openrouter";

  return <ModelIcon model={model} size={size} type="color" />;
};

export default ModelProviderIcon;
