import * as React from "react";
import { Claude, Gemini, ProviderIcon } from "@lobehub/icons";

const PROVIDER_ICON_ALIASES: Record<string, string> = {
  claude: "anthropic",
  anthropic: "anthropic",
  openai: "openai",
  google: "google",
  "meta-llama": "meta",
  meta: "meta",
  mistralai: "mistral",
  mistral: "mistral",
  deepseek: "deepseek",
  "x-ai": "xai",
  xai: "xai",
  qwen: "qwen",
  cohere: "cohere",
  perplexity: "perplexity",
  microsoft: "microsoft",
  nvidia: "nvidia",
  amazon: "aws",
  anthracite: "anthropic",
};

export function normalizeProviderForIcon(provider?: string): string {
  if (!provider) {
    return "openrouter";
  }

  const normalized = provider.trim().toLowerCase().replace(/^~/, "");
  return PROVIDER_ICON_ALIASES[normalized] ?? normalized;
}

interface ModelProviderIconProps {
  provider?: string;
  size?: number;
}

const ModelProviderIcon: React.FC<ModelProviderIconProps> = ({
  provider,
  size = 16,
}) => {
  const normalized = normalizeProviderForIcon(provider);

  if (normalized === "anthropic") {
    return <Claude.Color size={size} />;
  }

  if (normalized === "google") {
    return <Gemini.Color size={size} />;
  }

  return (
    <ProviderIcon provider={normalized} size={size} type="color" />
  );
};

export default ModelProviderIcon;