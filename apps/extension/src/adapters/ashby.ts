import {
  EEO_PATTERN,
  NEXT_TEXT,
  SUBMIT_TEXT,
} from '../shared/constants';
import type { SemanticKey } from '../shared/types';
import {
  buttonByText,
  fileInput,
  firstHeading,
  waitFor,
  type AtsAdapter,
} from './types';

export const ashbyAdapter: AtsAdapter = {
  id: 'ashby',
  match(url) {
    return (
      url.hostname === 'jobs.ashbyhq.com' ||
      url.hostname.endsWith('.ashbyhq.com')
    );
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          'form, input[type="email"], input[name*="email" i], [class*="ashby"] input',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      full_name: [
        'input[name*="_systemfield_name"]',
        'input[autocomplete="name"]',
      ],
      first_name: ['input[autocomplete="given-name"]'],
      last_name: ['input[autocomplete="family-name"]'],
      email: [
        'input[name*="_systemfield_email"]',
        'input[type="email"]',
        'input[autocomplete="email"]',
      ],
      phone: ['input[type="tel"]', 'input[autocomplete="tel"]'],
      resume: [
        'input[name*="_systemfield_resume"]',
        'input[type="file"]',
      ],
    };
  },
  shouldSkip(el, label) {
    if (EEO_PATTERN.test(label)) return true;
    const heading = el.closest('section, fieldset, form')?.querySelector('h2, h3, legend');
    const headingText = heading?.textContent || '';
    if (EEO_PATTERN.test(headingText)) return true;
    return Boolean(el.closest('[class*="eeo"], [class*="demographic"]'));
  },
  findResumeInput() {
    return fileInput([
      'input[name*="_systemfield_resume"]',
      'input[type="file"]',
    ]);
  },
  findCoverLetterInput() {
    return fileInput([
      'input[name*="cover"]',
      'input[type="file"][name*="cover" i]',
    ]);
  },
  findNextButton() {
    return buttonByText(NEXT_TEXT);
  },
  isSubmitStep() {
    return Boolean(buttonByText(SUBMIT_TEXT)) && !buttonByText(NEXT_TEXT);
  },
  guessCompany(doc = document) {
    return doc.title.split(/[-|]/)[0]?.trim() || '';
  },
  guessRole(doc = document) {
    return firstHeading(doc);
  },
};
