import type { AtsAdapter } from '../adapters';
import { detectAdapter } from '../adapters';
import { visible } from '../adapters/types';
import { semanticValue } from '../shared/applicant';
import {
  CAPTCHA_PATTERN,
  EEO_PATTERN,
  SALARY_PATTERN,
  SKIP_LEGAL_PATTERN,
  SSN_PATTERN,
  SUBMIT_TEXT,
} from '../shared/constants';
import { bestMatch } from '../shared/fuzzy';
import type { ApplicantPayload, FillProgress, PageContext } from '../shared/types';
import { discoverFields, hasFillableForm, type DiscoveredField } from './discover';
import {
  fileFromBase64,
  fillChoice,
  fillCombobox,
  fillFile,
  fillSelect,
  fillText,
  pauseBetweenSections,
  sleep,
} from './fillActor';
import { matchSelectOption } from './matcher';
import { hideOverlaySoon, markField, showOverlay } from './overlay';

function report(progress: FillProgress): void {
  void chrome.runtime.sendMessage({ type: 'FILL_PROGRESS', progress });
}

function shouldLeave(field: DiscoveredField): boolean {
  const text = `${field.label} ${field.name}`;
  return (
    EEO_PATTERN.test(text) ||
    CAPTCHA_PATTERN.test(text) ||
    SALARY_PATTERN.test(text) ||
    SSN_PATTERN.test(text) ||
    SKIP_LEGAL_PATTERN.test(text)
  );
}

function yesNoValue(value: string | boolean | null): string | boolean | null {
  if (value === true || value === false) return value;
  if (typeof value !== 'string') return value;
  const n = value.trim().toLowerCase();
  if (['yes', 'y', 'true'].includes(n)) return 'yes';
  if (['no', 'n', 'false'].includes(n)) return 'no';
  return value;
}

async function applySemantic(
  field: DiscoveredField,
  applicant: ApplicantPayload,
): Promise<'filled' | 'guessed' | 'skipped'> {
  if (!field.semantic) return 'skipped';
  if (field.kind === 'file') return 'skipped';

  const raw = semanticValue(field.semantic, applicant);
  if (raw === null || raw === '') return 'skipped';

  if (field.kind === 'select' && field.el instanceof HTMLSelectElement) {
    const asString = typeof raw === 'boolean' ? (raw ? 'yes' : 'no') : String(raw);
    const option = matchSelectOption(field.options, asString) || asString;
    const ok = await fillSelect(field.el, option);
    return ok ? 'filled' : 'skipped';
  }
  if (field.kind === 'radio' || field.kind === 'checkbox') {
    const coerced = yesNoValue(raw);
    const ok = await fillChoice(
      field.kind === 'radio' ? field.radios : [field.el as HTMLInputElement],
      coerced ?? String(raw),
    );
    return ok ? 'filled' : 'skipped';
  }
  if (field.kind === 'combobox') {
    const ok = await fillCombobox(field.el, String(raw));
    return ok ? 'filled' : 'guessed';
  }
  await fillText(field.el, String(raw));
  return 'filled';
}

async function uploadResume(
  adapter: AtsAdapter,
  applicant: ApplicantPayload,
): Promise<boolean> {
  const input = adapter.findResumeInput();
  if (!input || !applicant.resumeBase64) return false;
  const file = fileFromBase64(
    applicant.resumeBase64,
    applicant.resumeFileName,
    'application/pdf',
  );
  const ok = await fillFile(input, file);
  if (ok) markField(input, 'filled');
  if (ok && adapter.afterResumeUpload) await adapter.afterResumeUpload();
  return ok;
}

async function uploadCoverLetter(
  adapter: AtsAdapter,
  applicant: ApplicantPayload,
): Promise<boolean> {
  const input = adapter.findCoverLetterInput();
  if (!input) return false;
  if (applicant.coverLetterBase64 && applicant.coverLetterFileName) {
    const file = fileFromBase64(
      applicant.coverLetterBase64,
      applicant.coverLetterFileName,
      'application/pdf',
    );
    const ok = await fillFile(input, file);
    if (ok) markField(input, 'filled');
    return ok;
  }
  return false;
}

const WORK_COMPANY = /company name|^company$|employer/i;
const WORK_TITLE = /position|job title|^title$|role/i;
const WORK_RESP = /responsib|description|duties|what did you/i;
const WORK_START = /start date|from date|^from$/i;
const WORK_END = /end date|to date|^to$/i;
const WORK_CURRENT = /currently working|i currently work|current job/i;
const EDU_SCHOOL = /institution|school|university|college/i;
const EDU_DEGREE = /degree|field of study|major/i;
const EDU_DATES = /graduation|date range|dates attended/i;

async function fillRepeating(
  fields: DiscoveredField[],
  rows: Array<Record<string, string | boolean>>,
  matchers: Array<{ key: string; re: RegExp }>,
): Promise<number> {
  const unused = fields.filter((f) => !f.semantic && !shouldLeave(f));
  const buckets = matchers.map((m) => unused.filter((f) => m.re.test(f.label)));
  let filled = 0;
  for (let i = 0; i < rows.length; i += 1) {
    for (let m = 0; m < matchers.length; m += 1) {
      const field = buckets[m][i];
      const value = rows[i][matchers[m].key];
      if (!field || value === undefined || value === '') continue;
      if (typeof value === 'boolean' || field.kind === 'checkbox' || field.kind === 'radio') {
        const ok = await fillChoice(
          field.kind === 'radio' ? field.radios : [field.el as HTMLInputElement],
          value,
        );
        markField(field.el, ok ? 'filled' : 'skipped');
        if (ok) filled += 1;
        continue;
      }
      if (field.kind === 'select' && field.el instanceof HTMLSelectElement) {
        const ok = await fillSelect(field.el, String(value));
        markField(field.el, ok ? 'filled' : 'skipped');
        if (ok) filled += 1;
        continue;
      }
      await fillText(field.el, String(value));
      markField(field.el, 'filled');
      filled += 1;
    }
  }
  return filled;
}

async function answerFromBackground(
  resumeId: string,
  questions: string[],
): Promise<Array<{ question: string; answer: string }>> {
  if (questions.length === 0) return [];
  const response = (await chrome.runtime.sendMessage({
    type: 'ANSWER_QUESTIONS',
    resumeId,
    questions,
  })) as { pairs?: Array<{ question: string; answer: string }>; error?: string };
  if (response?.error) {
    console.warn('QA failed', response.error);
    return [];
  }
  return response?.pairs ?? [];
}

async function fillQuestionField(
  field: DiscoveredField,
  answer: string,
): Promise<boolean> {
  if (!answer.trim()) return false;
  if (field.kind === 'select' && field.el instanceof HTMLSelectElement) {
    const option = matchSelectOption(field.options, answer) || answer;
    return fillSelect(field.el, option);
  }
  if (field.kind === 'radio' || field.kind === 'checkbox') {
    return fillChoice(
      field.kind === 'radio' ? field.radios : [field.el as HTMLInputElement],
      answer,
    );
  }
  if (field.kind === 'combobox') {
    return fillCombobox(field.el, answer);
  }
  await fillText(field.el, answer);
  return true;
}

async function fillQuestions(
  leftover: DiscoveredField[],
  applicant: ApplicantPayload,
): Promise<{ filled: number; skipped: number }> {
  let filled = 0;
  let skipped = 0;
  const unmatched: DiscoveredField[] = [];

  for (const field of leftover) {
    if (shouldLeave(field) || field.kind === 'file') {
      markField(field.el, 'skipped');
      skipped += 1;
      continue;
    }
    const known = bestMatch(field.label, applicant.answers, (p) => p.question, 0.58);
    if (known) {
      const ok = await fillQuestionField(field, known.answer);
      markField(field.el, ok ? 'filled' : 'skipped');
      if (ok) filled += 1;
      else skipped += 1;
      continue;
    }
    unmatched.push(field);
  }

  const generated = await answerFromBackground(
    applicant.resumeId,
    unmatched.map((f) => f.label),
  );

  for (const field of unmatched) {
    const pair = bestMatch(field.label, generated, (p) => p.question, 0.4);
    if (!pair) {
      markField(field.el, 'skipped');
      skipped += 1;
      continue;
    }
    const ok = await fillQuestionField(field, pair.answer);
    markField(field.el, ok ? 'guessed' : 'skipped');
    if (ok) filled += 1;
    else skipped += 1;
  }

  return { filled, skipped };
}

async function fillVisibleStep(
  adapter: AtsAdapter,
  applicant: ApplicantPayload,
  step: number,
): Promise<{ filled: number; skipped: number }> {
  let filled = 0;
  let skipped = 0;

  const resumeOk = await uploadResume(adapter, applicant);
  if (resumeOk) filled += 1;
  const coverOk = await uploadCoverLetter(adapter, applicant);
  if (coverOk) filled += 1;

  await pauseBetweenSections();
  let fields = discoverFields(adapter);

  if (adapter.ensureWorkHistoryRows && applicant.workHistory.length) {
    await adapter.ensureWorkHistoryRows(applicant.workHistory.length);
    fields = discoverFields(adapter);
  }

  const used = new Set<DiscoveredField>();
  for (const field of fields) {
    if (shouldLeave(field)) {
      markField(field.el, 'skipped');
      skipped += 1;
      used.add(field);
      continue;
    }
    if (!field.semantic || field.kind === 'file') continue;
    const status = await applySemantic(field, applicant);
    markField(field.el, status);
    used.add(field);
    if (status === 'skipped') skipped += 1;
    else filled += 1;
  }

  const unused = fields.filter((f) => !used.has(f) && f.kind !== 'file');
  filled += await fillRepeating(
    unused,
    applicant.workHistory.map((row) => ({
      company: row.company,
      title: row.title,
      responsibilities: row.responsibilities,
      startDate: row.startDate,
      endDate: row.endDate,
      current: row.current,
    })),
    [
      { key: 'company', re: WORK_COMPANY },
      { key: 'title', re: WORK_TITLE },
      { key: 'responsibilities', re: WORK_RESP },
      { key: 'startDate', re: WORK_START },
      { key: 'endDate', re: WORK_END },
      { key: 'current', re: WORK_CURRENT },
    ],
  );

  filled += await fillRepeating(
    unused,
    applicant.education.map((row) => ({
      institution: row.institution,
      degree: row.degree,
      dateRange: row.dateRange,
    })),
    [
      { key: 'institution', re: EDU_SCHOOL },
      { key: 'degree', re: EDU_DEGREE },
      { key: 'dateRange', re: EDU_DATES },
    ],
  );

  if (applicant.certifications.length) {
    const certField = unused.find((f) => /certification|award/i.test(f.label));
    if (certField) {
      await fillText(certField.el, applicant.certifications.join('\n'));
      markField(certField.el, 'filled');
      filled += 1;
      used.add(certField);
    }
  }

  const leftover = discoverFields(adapter).filter((f) => {
    if (used.has(f) || f.kind === 'file' || f.semantic) return false;
    if (shouldLeave(f)) return false;
    const filledAlready = /rb-mark-filled|rb-mark-guessed/.test(f.el.className);
    return !filledAlready;
  });

  showOverlay(
    'Resume Builder Apply',
    `Step ${step + 1}: answering questions (${leftover.length})`,
  );
  const qa = await fillQuestions(leftover, applicant);
  filled += qa.filled;
  skipped += qa.skipped;

  report({
    ats: adapter.id,
    step,
    message: `Filled ${filled} fields on this step`,
    filled,
    skipped,
  });

  return { filled, skipped };
}

function captchaPresent(): boolean {
  return Boolean(
    document.querySelector(
      '.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]',
    ) || CAPTCHA_PATTERN.test(document.body.innerText.slice(0, 2000)),
  );
}

export async function runFill(applicant: ApplicantPayload): Promise<FillProgress> {
  const adapter = detectAdapter();
  showOverlay(
    'Resume Builder Apply',
    `Acting like a person on ${adapter.id}. Will not submit.`,
  );

  await adapter.waitForForm();
  if (!hasFillableForm()) {
    const progress: FillProgress = {
      ats: adapter.id,
      step: 0,
      message: 'No application form found on this frame',
      filled: 0,
      skipped: 0,
      done: true,
      error: 'No application form found',
    };
    report(progress);
    return progress;
  }

  if (captchaPresent()) {
    showOverlay('Resume Builder Apply', 'Captcha detected — fill stopped. Complete it yourself.');
  }

  let filled = 0;
  let skipped = 0;

  for (let step = 0; step < 8; step += 1) {
    if (captchaPresent() && step > 0) break;
    showOverlay('Resume Builder Apply', `${adapter.id}: filling step ${step + 1} like a person`);
    const result = await fillVisibleStep(adapter, applicant, step);
    filled += result.filled;
    skipped += result.skipped;

    if (adapter.isSubmitStep()) break;

    const next = adapter.findNextButton();
    if (!next || !visible(next)) break;
    const nextText = (next.innerText || (next as HTMLInputElement).value || '').trim();
    if (SUBMIT_TEXT.test(nextText)) break;

    await pauseBetweenSections();
    next.click();
    await sleep(1400);
    await adapter.waitForForm();
  }

  const progress: FillProgress = {
    ats: adapter.id,
    step: 0,
    message: 'Stopped before submit — review highlighted fields',
    filled,
    skipped,
    done: true,
    stoppedBeforeSubmit: true,
  };
  showOverlay(
    'Stopped before submit',
    `Filled ${filled}. Skipped ${skipped}. Green = filled, yellow = guessed, red = skipped. You click Submit.`,
  );
  hideOverlaySoon();
  report(progress);
  return progress;
}

export function getPageContext(): PageContext {
  const adapter = detectAdapter();
  return {
    url: location.href,
    title: document.title,
    ats: adapter.id,
    companyGuess: adapter.guessCompany(),
    roleGuess: adapter.guessRole(),
    isApplyPage: hasFillableForm(),
  };
}

export { hasFillableForm };
