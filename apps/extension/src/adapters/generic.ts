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

export const genericAdapter: AtsAdapter = {
  id: 'generic',
  match() {
    return true;
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          'form, input[type="email"], input[name*="first" i], input[type="file"]',
        ),
      4000,
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      first_name: [
        'input[autocomplete="given-name"]',
        'input[name*="first" i]',
        '#first_name',
      ],
      last_name: [
        'input[autocomplete="family-name"]',
        'input[name*="last" i]',
        '#last_name',
      ],
      full_name: ['input[autocomplete="name"]', 'input[name="name"]'],
      email: ['input[type="email"]', 'input[autocomplete="email"]'],
      phone: ['input[type="tel"]', 'input[autocomplete="tel"]'],
      address: ['input[autocomplete="street-address"]'],
      city: ['input[autocomplete="address-level2"]'],
      state: ['input[autocomplete="address-level1"]'],
      zip: ['input[autocomplete="postal-code"]'],
      country: ['input[autocomplete="country-name"]'],
      resume: ['input[type="file"]'],
    };
  },
  shouldSkip(_el, label) {
    return EEO_PATTERN.test(label);
  },
  findResumeInput() {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="file"]'),
    );
    return (
      inputs.find((el) => /resume|cv/i.test(`${el.name} ${el.id} ${el.accept}`)) ||
      fileInput(['input[type="file"]'])
    );
  },
  findCoverLetterInput() {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="file"]'),
    );
    return (
      inputs.find((el) => /cover/i.test(`${el.name} ${el.id}`)) ?? null
    );
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
