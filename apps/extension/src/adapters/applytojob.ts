import {
  CAPTCHA_PATTERN,
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

export const applyToJobAdapter: AtsAdapter = {
  id: 'applytojob',
  match(url) {
    return (
      url.hostname.endsWith('.applytojob.com') ||
      url.hostname === 'applytojob.com' ||
      url.hostname.includes('jazz.co')
    );
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          'form, #resume, input[name="first_name"], input[name="firstName"], input[id*="first" i]',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      first_name: [
        'input[name="first_name"]',
        'input[name="firstName"]',
        '#first_name',
      ],
      last_name: [
        'input[name="last_name"]',
        'input[name="lastName"]',
        '#last_name',
      ],
      email: ['input[name="email"]', 'input[type="email"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      address: ['input[name="address"]', 'input[name="city"]'],
      resume: ['#resume', 'input[name="resume"]', 'input[type="file"]'],
      cover_letter: [
        'input[name="cover_letter"]',
        'input[type="file"][name*="cover" i]',
      ],
    };
  },
  shouldSkip(el, label) {
    if (EEO_PATTERN.test(label) || CAPTCHA_PATTERN.test(label)) return true;
    return Boolean(
      el.closest('.g-recaptcha, [data-captcha], iframe[src*="recaptcha"]'),
    );
  },
  findResumeInput() {
    return fileInput(['#resume', 'input[name="resume"]', 'input[type="file"]']);
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
      doc.querySelector('.company-name, .job-company')?.textContent?.trim() ||
      doc.title.split(/[-|]/)[0]?.trim() ||
      ''
    );
  },
  guessRole(doc = document) {
    return firstHeading(doc);
  },
  async afterResumeUpload() {
    await new Promise((r) => setTimeout(r, 800));
  },
};
