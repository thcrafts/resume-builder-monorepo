import { hasFillableForm, getPageContext, runFill } from './orchestrator';
import { captureQuestions, scrapeJobPage } from './capture';
import { showOverlay } from './overlay';
import type { ApplicantPayload } from '../shared/types';

declare global {
  interface Window {
    __rbApplyInjected?: boolean;
  }
}

function install(): void {
  if (window.__rbApplyInjected) return;
  window.__rbApplyInjected = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)) return;

    if (message.type === 'PING') {
      sendResponse({ ok: true, hasForm: hasFillableForm() });
      return;
    }

    if (message.type === 'TAB_GET_PAGE_CONTEXT') {
      sendResponse(getPageContext());
      return;
    }

    if (message.type === 'TAB_CAPTURE_JOB') {
      sendResponse(scrapeJobPage());
      return;
    }

    if (message.type === 'TAB_CAPTURE_QUESTIONS') {
      sendResponse(captureQuestions());
      return;
    }

    if (message.type === 'TAB_SHOW_OVERLAY') {
      const payload = message as { title: string; detail: string };
      showOverlay(payload.title, payload.detail);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'TAB_FILL_APPLICATION') {
      const applicant = (message as { applicant: ApplicantPayload }).applicant;
      if (!hasFillableForm() && window !== window.top) {
        sendResponse({ skipped: true });
        return;
      }
      void runFill(applicant)
        .then((progress) => sendResponse({ ok: true, progress }))
        .catch((error: unknown) => {
          const text = error instanceof Error ? error.message : String(error);
          sendResponse({ ok: false, error: text });
        });
      return true;
    }
    return false;
  });
}

install();
