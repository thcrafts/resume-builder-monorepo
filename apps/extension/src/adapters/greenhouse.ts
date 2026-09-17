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

function skip(el: HTMLElement, label: string): boolean {
  if (EEO_PATTERN.test(label)) return true;
  if (el.closest('#demographic_questions, .demographic_questions, [data-qa="demographic"]')) {
    return true;
  }
  return false;
}

export const greenhouseAdapter: AtsAdapter = {
  id: 'greenhouse',
  match(url) {
    return (
      url.hostname === 'boards.greenhouse.io' ||
      url.hostname === 'job-boards.greenhouse.io' ||
      url.hostname.endsWith('.greenhouse.io')
    );
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          '#application-form, #main-form, form#job-app, form[id*="application"], #first_name, input[name="first_name"]',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      first_name: ['#first_name', 'input[name="first_name"]', '#first-name'],
      last_name: ['#last_name', 'input[name="last_name"]', '#last-name'],
      email: ['#email', 'input[name="email"]', 'input[type="email"]'],
      phone: ['#phone', 'input[name="phone"]', 'input[type="tel"]'],
      resume: ['#resume', 'input[name="resume"]', 'input[type="file"][id*="resume" i]'],
      cover_letter: [
        '#cover_letter',
        'input[name="cover_letter"]',
        'input[type="file"][id*="cover" i]',
      ],
      linkedin: [
        'input[name*="linkedin" i]',
        'input[id*="linkedin" i]',
        'input[placeholder*="linkedin" i]',
      ],
    };
  },
  shouldSkip: skip,
  findResumeInput() {
    return fileInput([
      '#resume',
      'input[name="resume"]',
      'input[type="file"][id*="resume" i]',
      'input[type="file"][name*="resume" i]',
    ]);
  },
  findCoverLetterInput() {
    return fileInput([
      '#cover_letter',
      'input[name="cover_letter"]',
      'input[type="file"][id*="cover" i]',
    ]);
  },
  findNextButton() {
    return buttonByText(NEXT_TEXT);
  },
  isSubmitStep() {
    const submit = buttonByText(SUBMIT_TEXT);
    const next = buttonByText(NEXT_TEXT);
    return Boolean(submit) && !next;
  },
  guessCompany(doc = document) {
    const logo = doc.querySelector('.company-name, [class*="company"]');
    return logo?.textContent?.trim() || doc.title.split(/[-|–]/)[0]?.trim() || '';
  },
  guessRole(doc = document) {
    return firstHeading(doc);
  },
};
