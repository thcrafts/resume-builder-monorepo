import type { UserResponse } from "../services/userService";

export function getApiKeyWarning(profile: UserResponse | null): string | null {
  if (!profile) {
    return null;
  }

  if (!profile.hasOpenrouterApiKey) {
    return "No OpenRouter API key configured. Add your OpenRouter API key in Profile settings before generating resumes.";
  }

  return null;
}
