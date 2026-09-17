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

export const leverAdapter: AtsAdapter = {
  id: 'lever',
  match(url) {
    return url.hostname === 'jobs.lever.co' || url.hostname.endsWith('.lever.co');
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          '.application-form, form[action*="apply"], input[name="name"], input[name="email"]',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      full_name: ['input[name="name"]', '#name'],
      email: ['input[name="email"]', 'input[type="email"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      current_company: ['input[name="org"]', 'input[name="company"]'],
      additional_info: ['textarea[name="comments"]', 'textarea[name="additional"]'],
      resume: ['input[name="resume"]', 'input[type="file"]'],
      linkedin: [
        'input[name="urls[LinkedIn]"]',
        'input[name*="linkedin" i]',
      ],
      github: ['input[name="urls[GitHub]"]', 'input[name*="github" i]'],
      website: [
        'input[name="urls[Portfolio]"]',
        'input[name="urls[Other]"]',
        'input[name*="website" i]',
      ],
    };
  },
  shouldSkip(el, label) {
    if (EEO_PATTERN.test(label)) return true;
    return Boolean(
      el.closest('.eeo, #eeo, .eeoc, [class*="eeo"], [id*="eeo"]'),
    );
  },
  findResumeInput() {
    return fileInput(['input[name="resume"]', 'input[type="file"]']);
  },
  findCoverLetterInput() {
    return fileInput([
      'input[name="coverLetter"]',
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
    const brand = doc.querySelector('.main-header-text .posting-headline, .company-name');
    return brand?.textContent?.trim() || doc.title.split(/[-|]/)[0]?.trim() || '';
  },
  guessRole(doc = document) {
    return (
      doc.querySelector('.posting-headline h2')?.textContent?.trim() ||
      firstHeading(doc)
    );
  },
};
