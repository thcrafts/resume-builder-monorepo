import type { AtsId, SemanticKey } from '../shared/types';

export interface AtsAdapter {
  id: AtsId;
  match(url: URL): boolean;
  waitForForm(doc?: Document): Promise<HTMLElement | null>;
  stableSelectors(): Partial<Record<SemanticKey, string[]>>;
  shouldSkip(el: HTMLElement, label: string): boolean;
  findResumeInput(root?: ParentNode): HTMLInputElement | null;
  findCoverLetterInput(root?: ParentNode): HTMLInputElement | null;
  findNextButton(root?: ParentNode): HTMLElement | null;
  isSubmitStep(root?: ParentNode): boolean;
  guessCompany(doc?: Document): string;
  guessRole(doc?: Document): string;
  afterResumeUpload?(): Promise<void>;
  ensureWorkHistoryRows?(count: number): Promise<void>;
  workHistoryContainer?(): HTMLElement | null;
}

export function qs<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector(selector);
}

export function qsa<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll(selector));
}

export function visible(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0;
}

export async function waitFor(
  predicate: () => HTMLElement | null,
  timeoutMs = 12000,
  intervalMs = 200,
): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = predicate();
    if (found) return found;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return predicate();
}

export function buttonByText(
  pattern: RegExp,
  root: ParentNode = document,
): HTMLElement | null {
  const candidates = qsa<HTMLElement>(
    'button, input[type="button"], input[type="submit"], a[role="button"], [role="button"]',
    root,
  );
  return (
    candidates.find((el) => {
      if (!visible(el) || el.hasAttribute('disabled')) return false;
      const text =
        el instanceof HTMLInputElement
          ? el.value || el.getAttribute('aria-label') || ''
          : `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`;
      return pattern.test(text.replace(/\s+/g, ' ').trim());
    }) ?? null
  );
}

export function firstHeading(doc: Document = document): string {
  const heading = doc.querySelector('h1, h2, [data-qa="job-title"]');
  return heading?.textContent?.trim() || doc.title || '';
}

export function fileInput(
  selectors: string[],
  root: ParentNode = document,
): HTMLInputElement | null {
  for (const selector of selectors) {
    const el = qs<HTMLInputElement>(selector, root);
    if (el && el.type === 'file') return el;
  }
  return (
    qsa<HTMLInputElement>('input[type="file"]', root).find((el) => visible(el)) ??
    qsa<HTMLInputElement>('input[type="file"]', root)[0] ??
    null
  );
}
