import type { SemanticKey } from '../shared/types';
import type { AtsAdapter } from '../adapters/types';
import { visible } from '../adapters/types';
import { inferSemantic } from './matcher';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'combobox';

export interface DiscoveredField {
  id: string;
  el: HTMLElement;
  label: string;
  name: string;
  kind: FieldKind;
  required: boolean;
  semantic: SemanticKey | null;
  options: string[];
  radios: HTMLInputElement[];
}

function cleanLabel(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\*$/, '').trim();
}

function labelFor(el: HTMLElement): string {
  if (el instanceof HTMLInputElement && el.labels?.[0]) {
    return cleanLabel(el.labels[0].innerText);
  }
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const bits = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.innerText || '')
      .join(' ');
    if (bits.trim()) return cleanLabel(bits);
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return cleanLabel(aria);
  const wrap = el.closest('label');
  if (wrap) return cleanLabel(wrap.innerText.replace(el instanceof HTMLInputElement ? el.value : '', ''));
  const id = el.getAttribute('id');
  if (id) {
    const byFor = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (byFor) return cleanLabel(byFor.textContent || '');
  }
  const parent = el.closest('div, p, li, fieldset, td, .field, .form-group');
  const prev = parent?.querySelector('label, .label, legend, span, p');
  if (prev && prev !== el) return cleanLabel(prev.textContent || '');
  const placeholder =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el.placeholder
      : '';
  return cleanLabel(placeholder || el.getAttribute('name') || el.id || '');
}

function kindOf(el: HTMLElement): FieldKind {
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLInputElement) {
    if (el.type === 'file') return 'file';
    if (el.type === 'radio') return 'radio';
    if (el.type === 'checkbox') return 'checkbox';
  }
  if (el.getAttribute('role') === 'combobox') return 'combobox';
  return 'text';
}

function isSkippableControl(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    if (['hidden', 'submit', 'button', 'reset', 'image', 'password'].includes(el.type)) {
      return true;
    }
  }
  if (el.closest('iframe')) return true;
  return false;
}

function resolveStable(
  adapter: AtsAdapter,
  el: HTMLElement,
): SemanticKey | null {
  const map = adapter.stableSelectors();
  for (const [key, selectors] of Object.entries(map) as Array<[SemanticKey, string[]]>) {
    for (const selector of selectors) {
      try {
        if (el.matches(selector)) return key;
      } catch {
        /* invalid selector */
      }
    }
  }
  return null;
}

export function discoverFields(adapter: AtsAdapter): DiscoveredField[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input, textarea, select, [role="combobox"], [contenteditable="true"]',
    ),
  );

  const radioGroups = new Map<string, HTMLInputElement[]>();
  const fields: DiscoveredField[] = [];
  const seen = new Set<HTMLElement>();

  for (const el of nodes) {
    if (seen.has(el) || isSkippableControl(el)) continue;
    if (!visible(el) && !(el instanceof HTMLInputElement && el.type === 'file')) continue;

    const label = labelFor(el);
    if (adapter.shouldSkip(el, label)) continue;

    const name =
      (el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
        ? el.name
        : '') ||
      el.id ||
      '';

    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const key = name || label;
      const group = radioGroups.get(key) ?? [];
      group.push(el);
      radioGroups.set(key, group);
      continue;
    }

    const kind = kindOf(el);
    const autocomplete =
      el instanceof HTMLInputElement ? el.autocomplete || '' : '';
    const type = el instanceof HTMLInputElement ? el.type : kind;
    const semantic =
      resolveStable(adapter, el) ||
      inferSemantic(label, name, autocomplete, type);

    const required =
      el.hasAttribute('required') ||
      el.getAttribute('aria-required') === 'true' ||
      /\*\s*$/.test(label) ||
      /required/i.test(el.closest('div, p, li')?.textContent?.slice(0, 80) || '');

    const options =
      el instanceof HTMLSelectElement
        ? Array.from(el.options)
            .map((opt) => opt.text.trim())
            .filter((text) => text && !/^select/i.test(text))
        : [];

    seen.add(el);
    fields.push({
      id: name || el.id || `${kind}-${fields.length}`,
      el,
      label,
      name,
      kind,
      required,
      semantic,
      options,
      radios: [],
    });
  }

  for (const [key, radios] of radioGroups) {
    const first = radios[0];
    const label = labelFor(first);
    if (adapter.shouldSkip(first, label)) continue;
    const semantic = inferSemantic(label, first.name, '', 'radio');
    fields.push({
      id: key,
      el: first,
      label,
      name: first.name,
      kind: 'radio',
      required: radios.some((r) => r.required),
      semantic,
      options: radios.map((r) => labelFor(r)),
      radios,
    });
  }

  return fields;
}

export function hasFillableForm(): boolean {
  return Boolean(
    document.querySelector(
      'form, input[type="email"], input[type="file"], input[name*="first" i], textarea',
    ),
  );
}
