export type MarkStatus = 'filled' | 'guessed' | 'skipped';

const STYLE_ID = 'rb-apply-style';
const ROOT_ID = 'rb-apply-overlay';

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483646;
      max-width: 320px;
      background: #111827;
      color: #f9fafb;
      border: 1px solid #374151;
      border-radius: 10px;
      padding: 12px 14px;
      font: 13px/1.4 system-ui, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
    }
    #${ROOT_ID} strong { display: block; margin-bottom: 4px; }
    #${ROOT_ID} .rb-muted { color: #9ca3af; font-size: 12px; }
    .rb-mark-filled { outline: 2px solid #10b981 !important; outline-offset: 2px; }
    .rb-mark-guessed { outline: 2px solid #f59e0b !important; outline-offset: 2px; }
    .rb-mark-skipped { outline: 2px solid #ef4444 !important; outline-offset: 2px; }
  `;
  document.documentElement.appendChild(style);
}

export function showOverlay(title: string, detail: string): void {
  ensureStyle();
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.documentElement.appendChild(root);
  }
  root.innerHTML = `<strong>${title}</strong><div class="rb-muted">${detail}</div>`;
}

export function hideOverlaySoon(): void {
  setTimeout(() => {
    document.getElementById(ROOT_ID)?.remove();
  }, 8000);
}

export function markField(el: HTMLElement, status: MarkStatus): void {
  el.classList.remove('rb-mark-filled', 'rb-mark-guessed', 'rb-mark-skipped');
  el.classList.add(`rb-mark-${status}`);
}
