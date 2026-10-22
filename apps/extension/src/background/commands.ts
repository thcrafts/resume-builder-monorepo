import type { ExtensionMessage } from '../shared/messages';
import type {
  ApplyCapture,
  PageCapture,
  QuestionCapture,
} from '../shared/types';
import {
  answerQuestions,
  extractJobPosting,
  getProfile,
  startResumeGeneration,
  waitForResume,
} from './api';
import { persistNestBase, fillActiveTab, injectContentScript, sendToFrames } from './runtime';
import { getCapture, getToken, saveCapture } from './storage';
import { showTabOverlay } from './tab-overlay';

export const COMMAND_CAPTURE_JOB = 'capture-job';
export const COMMAND_CAPTURE_QUESTIONS = 'capture-questions';
export const COMMAND_FILL_APPLICATION = 'fill-application';

let commandLock = false;

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab;
}

function broadcastCapture(message: string, capture?: ApplyCapture): void {
  chrome.runtime.sendMessage(
    { type: 'CAPTURE_PROGRESS', message, capture } satisfies ExtensionMessage,
    () => void chrome.runtime.lastError,
  );
}

async function setBadge(text: string, color = '#2563eb'): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
  } catch {
    /* ignore */
  }
}

async function overlayOnActive(
  title: string,
  detail: string,
  fallbackTabId?: number,
): Promise<void> {
  const tab = await activeTab().catch(() => null);
  const id = tab?.id ?? fallbackTabId;
  if (id) await showTabOverlay(id, title, detail);
}

async function requireLogin(tabId: number): Promise<void> {
  const token = await getToken();
  if (token) return;
  await showTabOverlay(
    tabId,
    'Resume Builder Apply',
    'Open the extension popup and sign in first.',
  );
  throw new Error('Sign in from the extension popup first');
}

async function scrapeJob(tabId: number): Promise<PageCapture> {
  await injectContentScript(tabId);
  const captures = await sendToFrames<PageCapture>(tabId, {
    type: 'TAB_CAPTURE_JOB',
  });
  const withText = [...captures].sort(
    (a, b) => (b?.pageText?.length || 0) - (a?.pageText?.length || 0),
  );
  if (withText[0]?.pageText) return withText[0];

  const [injected] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const text = (document.body?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20000);
      return {
        pageText: text,
        pageTitle: document.title || '',
        pageUrl: location.href,
        companyGuess: document.title.split(/[-|]/)[0]?.trim() || '',
        roleGuess:
          document.querySelector('h1')?.textContent?.trim() ||
          document.title ||
          '',
        hasForm: Boolean(document.querySelector('form, input[type="email"]')),
      };
    },
  });
  const result = injected?.result as PageCapture | undefined;
  if (!result?.pageText) {
    throw new Error('Could not read this page. Try a job description page.');
  }
  return result;
}

async function scrapeQuestions(tabId: number): Promise<QuestionCapture> {
  await injectContentScript(tabId);
  const captures = await sendToFrames<QuestionCapture>(tabId, {
    type: 'TAB_CAPTURE_QUESTIONS',
  });
  const withQuestions = [...captures].sort(
    (a, b) => (b?.questions?.length || 0) - (a?.questions?.length || 0),
  );
  if (withQuestions[0]?.questions?.length) return withQuestions[0];
  const withText = [...captures].sort(
    (a, b) => (b?.pageText?.length || 0) - (a?.pageText?.length || 0),
  );
  if (withText[0]) return withText[0];
  return { questions: [], pageText: '', hasForm: false };
}

async function upsertCapture(
  patch: Partial<ApplyCapture> & Pick<ApplyCapture, 'status'>,
): Promise<ApplyCapture> {
  const current = (await getCapture()) || {
    sourceUrl: '',
    companyName: '',
    roleType: '',
    jobDescription: '',
    resumeId: null,
    status: 'idle' as const,
    questions: [],
    answers: [],
    updatedAt: Date.now(),
  };
  const next: ApplyCapture = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  await saveCapture(next);
  return next;
}

async function captureJob(): Promise<void> {
  const tab = await activeTab();
  if (!tab.id) throw new Error('No active tab');
  await requireLogin(tab.id);
  await persistNestBase();
  await setBadge('1', '#2563eb');
  await showTabOverlay(
    tab.id,
    'Capturing job',
    'Copying this page and extracting company, title, and description…',
  );

  const page = await scrapeJob(tab.id);
  let capture = await upsertCapture({
    status: 'extracting',
    sourceUrl: page.pageUrl,
    companyName: page.companyGuess,
    roleType: page.roleGuess,
    jobDescription: page.pageText,
    resumeId: null,
    questions: [],
    answers: [],
    failureMessage: undefined,
  });
  broadcastCapture('Extracting job details from this page…', capture);

  const extracted = await extractJobPosting({
    pageText: page.pageText,
    pageTitle: page.pageTitle,
    pageUrl: page.pageUrl,
    companyGuess: page.companyGuess,
    roleGuess: page.roleGuess,
  });

  capture = await upsertCapture({
    status: 'generating',
    companyName: extracted.companyName,
    roleType: extracted.roleType,
    jobDescription: extracted.jobDescription,
  });
  await showTabOverlay(
    tab.id,
    'Generating resume',
    `${extracted.companyName} — ${extracted.roleType}\nTailoring a resume in the background. Stay on this flow.`,
  );
  broadcastCapture(
    `Generating tailored resume for ${extracted.companyName} — ${extracted.roleType}`,
    capture,
  );

  const profile = await getProfile();
  const resumeId = await startResumeGeneration({
    companyName: extracted.companyName,
    roleType: extracted.roleType,
    jobDescription: extracted.jobDescription,
    aiModel: profile.defaultAiModel || 'anthropic',
    aiVersion: profile.defaultAiVersion || 'anthropic/claude-sonnet-4.6',
  });

  capture = await upsertCapture({
    status: 'generating',
    resumeId,
  });
  await waitForResume(resumeId);
  capture = await upsertCapture({ status: 'ready' });
  await setBadge('✓', '#059669');
  await overlayOnActive(
    'Resume ready',
    `${extracted.companyName} — ${extracted.roleType}\nOpen the application form, then press Alt+Shift+2 to capture questions.`,
    tab.id,
  );
  broadcastCapture('Resume ready. Capture questions on the application page.', capture);
}

async function captureQuestionsCommand(): Promise<void> {
  const tab = await activeTab();
  if (!tab.id) throw new Error('No active tab');
  await requireLogin(tab.id);
  await persistNestBase();

  let capture = await getCapture();
  if (!capture?.resumeId) {
    throw new Error(
      'Capture the job description first (Alt+Shift+1) so a tailored resume exists.',
    );
  }
  const resumeId = capture.resumeId;

  if (capture.status === 'generating' || capture.status === 'extracting') {
    await showTabOverlay(
      tab.id,
      'Waiting on resume',
      'Resume is still generating. Holding for it, then capturing questions…',
    );
    await waitForResume(resumeId);
    capture = await upsertCapture({ status: 'ready' });
  }

  await setBadge('2', '#2563eb');
  await showTabOverlay(
    tab.id,
    'Capturing questions',
    'Reading the application form and drafting answers…',
  );

  const scraped = await scrapeQuestions(tab.id);
  const questions =
    scraped.questions.length > 0
      ? scraped.questions
      : scraped.pageText
        ? [scraped.pageText.slice(0, 8000)]
        : [];
  if (questions.length === 0) {
    throw new Error('No questions found on this page. Open the application form.');
  }

  capture = await upsertCapture({
    status: 'answering',
    questions: scraped.questions,
  });
  broadcastCapture(
    `Answering ${scraped.questions.length || 'page'} question(s)…`,
    capture,
  );

  const payload = scraped.questions.length
    ? scraped.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : questions[0];
  const result = await answerQuestions(resumeId, payload);
  const answers = result.questions.map((question, index) => ({
    question,
    answer: result.answers[index] || '',
  }));

  capture = await upsertCapture({
    status: 'answered',
    questions: result.questions,
    answers,
  });
  await setBadge('Q', '#059669');
  await overlayOnActive(
    'Answers ready',
    `${answers.length} answer(s) saved. Press Alt+Shift+3 to fill this form. Will not submit.`,
    tab.id,
  );
  broadcastCapture(`Saved ${answers.length} answers. Press Alt+Shift+3 to fill.`, capture);
}

async function fillCommand(): Promise<void> {
  const tab = await activeTab();
  if (!tab.id) throw new Error('No active tab');
  await requireLogin(tab.id);
  await persistNestBase();

  const capture = await getCapture();
  if (!capture?.resumeId) {
    throw new Error(
      'Capture the job first (Alt+Shift+1), then questions (Alt+Shift+2).',
    );
  }
  const resumeId = capture.resumeId;
  if (capture.status === 'generating' || capture.status === 'extracting') {
    await showTabOverlay(tab.id, 'Waiting on resume', 'Resume is still generating…');
    await waitForResume(resumeId);
    await upsertCapture({ status: 'ready' });
  }

  await setBadge('3', '#2563eb');
  await showTabOverlay(
    tab.id,
    'Filling application',
    'Filling like a person from the captured resume and answers. Will not submit.',
  );
  await fillActiveTab(resumeId);
  await setBadge('✓', '#059669');
}

export async function runCommand(command: string): Promise<void> {
  if (
    command !== COMMAND_CAPTURE_JOB &&
    command !== COMMAND_CAPTURE_QUESTIONS &&
    command !== COMMAND_FILL_APPLICATION
  ) {
    return;
  }
  if (commandLock) {
    await overlayOnActive(
      'Resume Builder Apply',
      'Another hotkey is still running.',
    );
    return;
  }
  commandLock = true;
  try {
    if (command === COMMAND_CAPTURE_JOB) {
      await captureJob();
      return;
    }
    if (command === COMMAND_CAPTURE_QUESTIONS) {
      await captureQuestionsCommand();
      return;
    }
    await fillCommand();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    await setBadge('!', '#dc2626');
    const capture = await upsertCapture({
      status: 'failed',
      failureMessage: text,
    }).catch(() => undefined);
    await overlayOnActive('Resume Builder Apply', text);
    broadcastCapture(text, capture);
    throw error;
  } finally {
    commandLock = false;
  }
}
