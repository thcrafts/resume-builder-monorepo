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

export const workableAdapter: AtsAdapter = {
  id: 'workable',
  match(url) {
    return (
      url.hostname === 'apply.workable.com' ||
      url.hostname.endsWith('.workable.com')
    );
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          'form, [data-ui="application-form"], input[name="firstname"], input[data-ui="firstname"]',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      first_name: [
        'input[name="firstname"]',
        '[data-ui="firstname"]',
        'input[autocomplete="given-name"]',
      ],
      last_name: [
        'input[name="lastname"]',
        '[data-ui="lastname"]',
        'input[autocomplete="family-name"]',
      ],
      email: ['input[name="email"]', 'input[type="email"]', '[data-ui="email"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]', '[data-ui="phone"]'],
      address: ['input[name="address"]', '[data-ui="address"]'],
      headline: ['input[name="headline"]', '[data-ui="headline"]'],
      resume: [
        'input[name="resume"]',
        'input[type="file"][name*="resume" i]',
        '[data-ui="resume"] input[type="file"]',
      ],
      cover_letter: [
        'input[name="cover_letter"]',
        'input[type="file"][name*="cover" i]',
      ],
      cover_letter_text: ['textarea[name="cover_letter"]', '[data-ui="cover-letter"] textarea'],
    };
  },
  shouldSkip(el, label) {
    if (EEO_PATTERN.test(label)) return true;
    return Boolean(el.closest('[data-ui*="eeo"], [class*="eeo"]'));
  },
  findResumeInput() {
    return fileInput([
      'input[name="resume"]',
      'input[type="file"][name*="resume" i]',
      '[data-ui="resume"] input[type="file"]',
      'input[type="file"]',
    ]);
  },
  findCoverLetterInput() {
    return fileInput([
      'input[name="cover_letter"]',
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
    return (
      doc.querySelector('[data-ui="company-name"]')?.textContent?.trim() ||
      doc.title.split(/[-|]/)[0]?.trim() ||
      ''
    );
  },
  guessRole(doc = document) {
    return (
      doc.querySelector('[data-ui="job-title"]')?.textContent?.trim() ||
      firstHeading(doc)
    );
  },
  async afterResumeUpload() {
    await new Promise((r) => setTimeout(r, 1200));
  },
};
