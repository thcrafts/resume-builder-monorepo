export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export async function pauseBetweenFields(): Promise<void> {
  await sleep(jitter(180, 520));
}

export async function pauseBetweenSections(): Promise<void> {
  await sleep(jitter(600, 1100));
}

function nativeValueSetter(el: HTMLInputElement | HTMLTextAreaElement) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  return Object.getOwnPropertyDescriptor(proto, 'value')?.set;
}

function dispatchInput(el: HTMLElement, extra?: Event): void {
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  if (extra) el.dispatchEvent(extra);
}

export async function scrollIntoView(el: HTMLElement): Promise<void> {
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  await sleep(jitter(150, 280));
}

export async function focusClick(el: HTMLElement): Promise<void> {
  await scrollIntoView(el);
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.focus();
  el.click();
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await sleep(jitter(40, 90));
}

async function typeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  await focusClick(el);
  const setter = nativeValueSetter(el);
  setter?.call(el, '');
  dispatchInput(el);
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));

  if (value.length > 180) {
    const chunk = 12;
    for (let i = 0; i < value.length; i += chunk) {
      const next = value.slice(0, i + chunk);
      setter?.call(el, next);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value.slice(i, i + chunk) }));
      await sleep(jitter(18, 40));
    }
  } else {
    let current = '';
    for (const char of value) {
      current += char;
      setter?.call(el, current);
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }),
      );
      await sleep(jitter(28, 72));
    }
  }

  dispatchInput(el);
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  await pauseBetweenFields();
}

export async function fillText(el: HTMLElement, value: string): Promise<void> {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    await typeValue(el, value);
    return;
  }
  if (el.isContentEditable) {
    await focusClick(el);
    el.textContent = '';
    for (const char of value) {
      document.execCommand('insertText', false, char);
      await sleep(jitter(24, 60));
    }
    dispatchInput(el);
    await pauseBetweenFields();
  }
}

export async function fillSelect(el: HTMLSelectElement, desired: string): Promise<boolean> {
  await focusClick(el);
  const options = Array.from(el.options);
  const normalized = desired.trim().toLowerCase();
  const match =
    options.find((opt) => opt.value.toLowerCase() === normalized) ||
    options.find((opt) => opt.text.trim().toLowerCase() === normalized) ||
    options.find((opt) => opt.text.toLowerCase().includes(normalized)) ||
    options.find((opt) => normalized.includes(opt.text.toLowerCase()) && opt.text.trim().length > 1);

  if (!match) {
    await pauseBetweenFields();
    return false;
  }
  el.value = match.value;
  dispatchInput(el);
  await pauseBetweenFields();
  return true;
}

function labelOfRadio(input: HTMLInputElement): string {
  if (input.labels?.[0]) return input.labels[0].innerText.trim();
  const wrap = input.closest('label');
  if (wrap) return wrap.innerText.trim();
  return `${input.value} ${input.getAttribute('aria-label') || ''}`.trim();
}

export async function fillChoice(
  inputs: HTMLInputElement[],
  desired: string | boolean,
): Promise<boolean> {
  const want =
    typeof desired === 'boolean'
      ? desired
        ? 'yes'
        : 'no'
      : desired.trim().toLowerCase();
  if (!want) return false;

  const scored = inputs
    .filter((input) => !input.disabled)
    .map((input) => {
      const label = labelOfRadio(input).toLowerCase();
      const value = (input.value || '').toLowerCase();
      let score = 0;
      if (label === want || value === want) score = 3;
      else if (label.includes(want) || want.includes(label)) score = 2;
      else if (value.includes(want)) score = 1;
      if (want === 'yes' && /^(yes|true|y)\b/.test(label)) score = Math.max(score, 3);
      if (want === 'no' && /^(no|false|n)\b/.test(label)) score = Math.max(score, 3);
      return { input, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) return false;
  await focusClick(best.input);
  if (best.input.type === 'checkbox') {
    const shouldCheck = want !== 'no' && want !== 'false';
    if (best.input.checked !== shouldCheck) best.input.click();
  }
  dispatchInput(best.input);
  await pauseBetweenFields();
  return true;
}

export async function fillFile(input: HTMLInputElement, file: File): Promise<boolean> {
  await scrollIntoView(input);
  input.focus();
  await sleep(jitter(200, 400));
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  await sleep(jitter(400, 800));
  return Boolean(input.files && input.files.length > 0);
}

export async function fillCombobox(el: HTMLElement, desired: string): Promise<boolean> {
  await focusClick(el);
  if (el instanceof HTMLInputElement) {
    await typeValue(el, desired);
  }
  await sleep(jitter(250, 450));
  const options = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"], li[role="option"], div[role="option"]'),
  );
  const match = options.find((opt) =>
    opt.innerText.toLowerCase().includes(desired.toLowerCase()),
  );
  if (match) {
    match.click();
    await pauseBetweenFields();
    return true;
  }
  return false;
}

export function fileFromBase64(base64: string, name: string, type: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type });
}
