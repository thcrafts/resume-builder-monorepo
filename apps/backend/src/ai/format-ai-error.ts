function extractProviderDetail(raw: string): string | null {
  const providerMatch = raw.match(/Provider:\s*([^—]+)/i);
  const detailsMatch = raw.match(/Details:\s*(.+)$/i);

  if (detailsMatch?.[1]) {
    return detailsMatch[1].trim();
  }

  if (providerMatch?.[1]) {
    return providerMatch[1].trim();
  }

  return null;
}

export function formatAiProviderError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Failed to generate resume';

  if (/400[\s\S]*provider returned error/i.test(raw)) {
    const detail = extractProviderDetail(raw);
    if (detail) {
      return `OpenRouter provider error: ${detail}`;
    }
    return 'OpenRouter rejected the request for this model. Try a different model version or disable strict JSON output in resume settings.';
  }

  if (
    /403[\s\S]*permission_error/i.test(raw) ||
    /PermissionDeniedError/i.test(raw)
  ) {
    return 'API key lacks permission for this model. Try a different model.';
  }

  if (/401[\s\S]*authentication_error/i.test(raw)) {
    return 'Invalid or expired API key. Update your OpenRouter API key in Profile settings.';
  }

  if (/429[\s\S]*rate_limit/i.test(raw)) {
    return 'Rate limit exceeded. Wait a moment and retry.';
  }

  return raw.trim() || 'Failed to generate resume';
}
