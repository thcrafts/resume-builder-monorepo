const STYLE_ID = 'rb-apply-style';
const ROOT_ID = 'rb-apply-overlay';

export function injectTabOverlay(title: string, detail: string): void {
  const escape = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const existingStyle = document.getElementById(STYLE_ID);
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 2147483646;
        max-width: 360px;
        background: #111827;
        color: #f9fafb;
        border: 1px solid #374151;
        border-radius: 10px;
        padding: 12px 14px;
        font: 13px/1.4 system-ui, sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
      }
      #${ROOT_ID} strong { display: block; margin-bottom: 4px; }
      #${ROOT_ID} .rb-muted { color: #9ca3af; font-size: 12px; white-space: pre-wrap; }
    `;
    document.documentElement.appendChild(style);
  }

  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.documentElement.appendChild(root);
  }
  root.innerHTML = `<strong>${escape(title)}</strong><div class="rb-muted">${escape(detail)}</div>`;
}

export async function showTabOverlay(
  tabId: number,
  title: string,
  detail: string,
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'TAB_SHOW_OVERLAY',
      title,
      detail,
    });
    return;
  } catch {
    /* inject below */
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectTabOverlay,
      args: [title, detail],
    });
  } catch {
    /* page may block scripting */
  }
}
