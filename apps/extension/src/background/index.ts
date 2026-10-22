import type { ExtensionMessage } from '../shared/messages';
import type { PageContext } from '../shared/types';
import { answerQuestions, listResumes, login, probeNestApi } from './api';
import { runCommand } from './commands';
import {
  fillActiveTab,
  injectContentScript,
  persistNestBase,
  sendToFrames,
} from './runtime';
import {
  clearSession,
  getApiBaseUrl,
  getCapture,
  getDefaults,
  getToken,
  getUser,
  saveSession,
  saveSettings,
} from './storage';

async function ensureOriginPermission(apiBaseUrl: string): Promise<void> {
  let origin: string;
  try {
    origin = `${new URL(apiBaseUrl).origin}/*`;
  } catch {
    throw new Error('Invalid API URL');
  }
  const have = await chrome.permissions.contains({ origins: [origin] });
  if (have) return;
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) {
    throw new Error(`Permission denied for ${origin}`);
  }
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  void handle(message, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      sendResponse({ error: text });
    });
  return true;
});

chrome.commands.onCommand.addListener((command) => {
  void runCommand(command).catch((error: unknown) => {
    console.warn('Hotkey failed', error);
  });
});

async function handle(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'PING': {
      return { ok: true };
    }
    case 'GET_SESSION': {
      return {
        apiBaseUrl: await getApiBaseUrl(),
        token: await getToken(),
        user: await getUser(),
        defaults: await getDefaults(),
      };
    }
    case 'GET_CAPTURE': {
      return { capture: await getCapture() };
    }
    case 'PROBE_API': {
      const apiBaseUrl = await persistNestBase(
        message.apiBaseUrl,
        message.lanBases,
      );
      return { apiBaseUrl };
    }
    case 'LOGIN': {
      const apiBaseUrl = await persistNestBase(
        message.apiBaseUrl,
        message.lanBases,
      );
      await ensureOriginPermission(apiBaseUrl);
      const result = await login(message.email, message.password, apiBaseUrl);
      const user = {
        _id: String(result.user._id ?? ''),
        email: result.user.email,
        name: result.user.name || result.user.email,
      };
      await saveSession({
        apiBaseUrl,
        token: result.access_token,
        user,
      });
      return { ok: true, user, apiBaseUrl };
    }
    case 'LOGOUT': {
      await clearSession();
      return { ok: true };
    }
    case 'SAVE_SETTINGS': {
      const apiBaseUrl = await probeNestApi(message.apiBaseUrl, message.lanBases);
      await ensureOriginPermission(apiBaseUrl);
      await saveSettings({
        apiBaseUrl,
        defaults: message.defaults,
      });
      return { ok: true, apiBaseUrl };
    }
    case 'LIST_RESUMES': {
      await persistNestBase(undefined, message.lanBases);
      const resumes = await listResumes();
      return {
        resumes: resumes.filter((r) => r.status !== 'in_progress' && r.status !== 'failed'),
      };
    }
    case 'GET_PAGE_CONTEXT': {
      const tab = await activeTab();
      if (!tab.id || !tab.url) {
        return {
          url: '',
          title: tab.title || '',
          ats: 'generic',
          companyGuess: '',
          roleGuess: '',
          isApplyPage: false,
        } satisfies PageContext;
      }
      await injectContentScript(tab.id);
      const contexts = await sendToFrames<PageContext>(tab.id, {
        type: 'TAB_GET_PAGE_CONTEXT',
      });
      const withForm = contexts.find((c) => c?.isApplyPage);
      if (withForm) return withForm;
      if (contexts[0]) return contexts[0];
      const { detectAdapter } = await import('../adapters');
      const adapter = detectAdapter(tab.url);
      return {
        url: tab.url,
        title: tab.title || '',
        ats: adapter.id,
        companyGuess: tab.title?.split(/[-|]/)[0]?.trim() || '',
        roleGuess: tab.title || '',
        isApplyPage: /apply|application/i.test(tab.url),
      } satisfies PageContext;
    }
    case 'ANSWER_QUESTIONS': {
      const payload = message.questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n');
      const result = await answerQuestions(message.resumeId, payload);
      const pairs = result.questions.map((question, index) => ({
        question,
        answer: result.answers[index] || '',
      }));
      return { pairs };
    }
    case 'FILL_PROGRESS':
    case 'CAPTURE_PROGRESS': {
      return { ok: true };
    }
    case 'FILL_ACTIVE_TAB': {
      await persistNestBase();
      return fillActiveTab(message.resumeId);
    }
    case 'FILL_APPLICATION':
    case 'TAB_GET_PAGE_CONTEXT':
    case 'TAB_CAPTURE_JOB':
    case 'TAB_CAPTURE_QUESTIONS':
    case 'TAB_SHOW_OVERLAY':
    case 'TAB_FILL_APPLICATION': {
      return { ok: true };
    }
    default:
      console.warn('Unhandled extension message', message);
      return { ok: true };
  }
}
