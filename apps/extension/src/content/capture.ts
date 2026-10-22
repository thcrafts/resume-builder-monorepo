import { detectAdapter } from '../adapters';
import type { PageCapture, QuestionCapture } from '../shared/types';
import { discoverFields } from './discover';
import { shouldLeaveField } from './skip';

const PAGE_TEXT_LIMIT = 20000;
const MAX_QUESTIONS = 40;

const JOB_BODY_SELECTORS = [
  '[data-qa="job-description"]',
  '[data-testid="job-description"]',
  '.job-description',
  '#job-description',
  '.job__description',
  '.posting-page',
  'article',
  'main',
  '#content',
];

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function companyFromUrl(href: string): string {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (host.endsWith('lever.co') || host.includes('ashbyhq.com')) {
      return decodeURIComponent(parts[0] || '').replace(/-/g, ' ');
    }
    if (host.includes('greenhouse.io') || host.includes('workable.com')) {
      return decodeURIComponent(parts[0] || '').replace(/-/g, ' ');
    }
    return '';
  } catch {
    return '';
  }
}

function jobBodyText(): string {
  for (const selector of JOB_BODY_SELECTORS) {
    const el = document.querySelector(selector);
    const text = el instanceof HTMLElement ? collapse(el.innerText || '') : '';
    if (text.length > 200) return text.slice(0, PAGE_TEXT_LIMIT);
  }
  return '';
}

export function scrapeJobPage(): PageCapture {
  const adapter = detectAdapter();
  const focused = jobBodyText();
  const body = collapse(document.body?.innerText || '');
  const pageText = (focused || body).slice(0, PAGE_TEXT_LIMIT);
  const companyGuess =
    adapter.guessCompany() || companyFromUrl(location.href) || '';
  const roleGuess = adapter.guessRole() || document.title || '';

  return {
    pageText,
    pageTitle: document.title || '',
    pageUrl: location.href,
    companyGuess,
    roleGuess,
    hasForm: Boolean(
      document.querySelector(
        'form, input[type="email"], input[type="file"], textarea',
      ),
    ),
  };
}

export function captureQuestions(): QuestionCapture {
  const adapter = detectAdapter();
  const fields = discoverFields(adapter);
  const seen = new Set<string>();
  const questions: string[] = [];

  for (const field of fields) {
    if (field.kind === 'file' || field.semantic) continue;
    if (shouldLeaveField(field.label, field.name)) continue;
    const label = collapse(field.label);
    if (label.length < 8) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(label);
    if (questions.length >= MAX_QUESTIONS) break;
  }

  return {
    questions,
    pageText: scrapeJobPage().pageText,
    hasForm: fields.length > 0,
  };
}
