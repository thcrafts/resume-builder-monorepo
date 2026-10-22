import { applyToJobAdapter } from './applytojob';
import { ashbyAdapter } from './ashby';
import { genericAdapter } from './generic';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { paylocityAdapter } from './paylocity';
import type { AtsAdapter } from './types';
import { workableAdapter } from './workable';

const NAMED: AtsAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  workableAdapter,
  ashbyAdapter,
  applyToJobAdapter,
  paylocityAdapter,
];

export function detectAdapter(href?: string): AtsAdapter {
  const value =
    href ||
    (typeof location !== 'undefined' ? location.href : '');
  try {
    const url = new URL(value);
    return NAMED.find((adapter) => adapter.match(url)) ?? genericAdapter;
  } catch {
    return genericAdapter;
  }
}

export { genericAdapter };
export type { AtsAdapter } from './types';
