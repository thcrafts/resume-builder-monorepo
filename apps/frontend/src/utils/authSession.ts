const TOKEN_STORAGE_KEY = 'access_token';
const EXPIRY_SKEW_SECONDS = 30;

export type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

export function getAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds + EXPIRY_SKEW_SECONDS;
}

export function isUnauthorizedStatus(status: number | undefined): boolean {
  return status === 401;
}

export function getAxiosErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: number } }).response?.status ===
      'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }

  return undefined;
}
