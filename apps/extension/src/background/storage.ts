import {
  DEFAULT_API_BASE_URL,
  DEFAULT_APPLY_DEFAULTS,
  isViteDevProxyUrl,
  type ApplyCapture,
  type ApplyDefaults,
  type SessionUser,
} from '../shared/types';

const KEYS = {
  apiBaseUrl: 'apiBaseUrl',
  token: 'access_token',
  user: 'user',
  defaults: 'applyDefaults',
  capture: 'applyCapture',
} as const;

export function sanitizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed || isViteDevProxyUrl(trimmed)) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed;
}

export async function getApiBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(KEYS.apiBaseUrl);
  const raw = (stored[KEYS.apiBaseUrl] as string) || '';
  const url = sanitizeApiBaseUrl(raw);
  if (raw && url !== raw.replace(/\/$/, '')) {
    await chrome.storage.local.set({ [KEYS.apiBaseUrl]: url });
  }
  return url;
}

export async function getToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(KEYS.token);
  return (stored[KEYS.token] as string) || null;
}

export async function getUser(): Promise<SessionUser | null> {
  const stored = await chrome.storage.local.get(KEYS.user);
  return (stored[KEYS.user] as SessionUser) || null;
}

export async function getDefaults(): Promise<ApplyDefaults> {
  const stored = await chrome.storage.local.get(KEYS.defaults);
  return {
    ...DEFAULT_APPLY_DEFAULTS,
    ...((stored[KEYS.defaults] as ApplyDefaults) || {}),
  };
}

export async function saveSession(input: {
  apiBaseUrl: string;
  token: string;
  user: SessionUser;
}): Promise<void> {
  await chrome.storage.local.set({
    [KEYS.apiBaseUrl]: sanitizeApiBaseUrl(input.apiBaseUrl),
    [KEYS.token]: input.token,
    [KEYS.user]: input.user,
  });
}

export async function saveSettings(input: {
  apiBaseUrl: string;
  defaults: ApplyDefaults;
}): Promise<void> {
  await chrome.storage.local.set({
    [KEYS.apiBaseUrl]: sanitizeApiBaseUrl(input.apiBaseUrl),
    [KEYS.defaults]: input.defaults,
  });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove([KEYS.token, KEYS.user]);
}

export async function getCapture(): Promise<ApplyCapture | null> {
  const stored = await chrome.storage.local.get(KEYS.capture);
  return (stored[KEYS.capture] as ApplyCapture) || null;
}

export async function saveCapture(capture: ApplyCapture): Promise<void> {
  await chrome.storage.local.set({
    [KEYS.capture]: { ...capture, updatedAt: Date.now() },
  });
}

export async function clearCapture(): Promise<void> {
  await chrome.storage.local.remove(KEYS.capture);
}
