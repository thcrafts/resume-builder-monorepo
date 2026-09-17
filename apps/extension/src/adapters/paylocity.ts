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
  qsa,
  visible,
  waitFor,
  type AtsAdapter,
} from './types';

function clickAddWorkHistory(): boolean {
  const add = qsa<HTMLElement>('button, a, input[type="button"]').find((el) => {
    if (!visible(el)) return false;
    const text = (el.innerText || (el as HTMLInputElement).value || '').toLowerCase();
    return (
      text.includes('add another') ||
      text.includes('add work') ||
      text.includes('add position') ||
      text.includes('add experience')
    );
  });
  if (add) {
    add.click();
    return true;
  }
  return false;
}

export const paylocityAdapter: AtsAdapter = {
  id: 'paylocity',
  match(url) {
    return (
      url.hostname.endsWith('.paylocity.com') ||
      url.hostname === 'paylocity.com' ||
      /recruiting\.paylocity\.com$/i.test(url.hostname)
    );
  },
  async waitForForm() {
    return waitFor(
      () =>
        document.querySelector<HTMLElement>(
          'form, input[id*="FirstName" i], input[name*="FirstName" i], input[type="file"]',
        ),
    );
  },
  stableSelectors(): Partial<Record<SemanticKey, string[]>> {
    return {
      first_name: [
        'input[id*="FirstName" i]',
        'input[name*="FirstName" i]',
        'input[autocomplete="given-name"]',
      ],
      last_name: [
        'input[id*="LastName" i]',
        'input[name*="LastName" i]',
        'input[autocomplete="family-name"]',
      ],
      email: [
        'input[id*="Email" i]',
        'input[name*="Email" i]',
        'input[type="email"]',
      ],
      phone: [
        'input[id*="Phone" i]',
        'input[name*="Phone" i]',
        'input[type="tel"]',
      ],
      address: ['input[id*="Address" i]', 'input[name*="Address" i]'],
      linkedin: ['input[id*="LinkedIn" i]', 'input[name*="LinkedIn" i]'],
      start_date: [
        'input[id*="Available" i]',
        'input[name*="StartDate" i]',
        'input[id*="StartDate" i]',
      ],
      sms_consent: [
        'input[id*="SMS" i]',
        'input[name*="SMS" i]',
        'input[id*="TextMessage" i]',
      ],
      heard_about: [
        'select[id*="Hear" i]',
        'input[id*="HearAbout" i]',
        'select[name*="Source" i]',
      ],
      worked_before: [
        'input[id*="WorkedWith" i]',
        'select[id*="Previously" i]',
      ],
      resume: ['input[type="file"][id*="Resume" i]', 'input[type="file"]'],
      cover_letter: ['input[type="file"][id*="Cover" i]'],
    };
  },
  shouldSkip(el, label) {
    if (EEO_PATTERN.test(label)) return true;
    return Boolean(el.closest('[id*="EEO" i], [id*="Demographic" i]'));
  },
  findResumeInput() {
    return fileInput([
      'input[type="file"][id*="Resume" i]',
      'input[type="file"][name*="Resume" i]',
      'input[type="file"]',
    ]);
  },
  findCoverLetterInput() {
    return fileInput([
      'input[type="file"][id*="Cover" i]',
      'input[type="file"][name*="Cover" i]',
    ]);
  },
  findNextButton() {
    return (
      buttonByText(NEXT_TEXT) ||
      buttonByText(/^next$/i) ||
      document.querySelector<HTMLElement>(
        'input[value="Next"], input[id*="Next" i], button[id*="Next" i]',
      )
    );
  },
  isSubmitStep() {
    const body = document.body.innerText.slice(0, 4000);
    if (/step\s+\d+\s+of\s+\d+/i.test(body)) {
      const match = body.match(/step\s+(\d+)\s+of\s+(\d+)/i);
      if (match && match[1] === match[2]) {
        return Boolean(buttonByText(SUBMIT_TEXT) || /review/i.test(body));
      }
    }
    if (/review (your )?application/i.test(body)) return true;
    return Boolean(buttonByText(SUBMIT_TEXT)) && !this.findNextButton();
  },
  guessCompany(doc = document) {
    return (
      doc.querySelector('.company-name, .logo img')?.getAttribute('alt') ||
      doc.title.split(/[-|]/)[0]?.trim() ||
      ''
    );
  },
  guessRole(doc = document) {
    return firstHeading(doc);
  },
  async afterResumeUpload() {
    const parse = qsa<HTMLElement>('button, a, input[type="button"], label').find(
      (el) =>
        visible(el) &&
        /fill out application with my resume|use (my )?resume/i.test(
          el.innerText || (el as HTMLInputElement).value || '',
        ),
    );
    parse?.click();
    await new Promise((r) => setTimeout(r, 1500));
  },
  workHistoryContainer() {
    return document.querySelector<HTMLElement>(
      '[id*="WorkHistory" i], [id*="Employment" i], [class*="work-history" i]',
    );
  },
  async ensureWorkHistoryRows(count: number) {
    const needed = Math.max(0, count - 1);
    for (let i = 0; i < needed; i += 1) {
      if (!clickAddWorkHistory()) break;
      await new Promise((r) => setTimeout(r, 400));
    }
  },
};
