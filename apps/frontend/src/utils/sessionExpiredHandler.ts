let sessionExpiredHandler: (() => void) | null = null;
let isHandlingSessionExpired = false;

export function registerSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired(): void {
  if (isHandlingSessionExpired) {
    return;
  }

  isHandlingSessionExpired = true;
  sessionExpiredHandler?.();
}

export function resetSessionExpiredHandling(): void {
  isHandlingSessionExpired = false;
}
