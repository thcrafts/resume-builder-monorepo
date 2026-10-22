import type { ExtensionMessage } from '../shared/messages';
import type { FillProgress } from '../shared/types';
import {
  downloadResumePdf,
  getProfile,
  getResume,
  probeNestApi,
  tryDownloadCoverLetterPdf,
} from './api';
import { getApiBaseUrl, getDefaults, saveSettings } from './storage';

export async function persistNestBase(
  preferred?: string,
  lanBases: string[] = [],
): Promise<string> {
  const apiBaseUrl = await probeNestApi(
    preferred ?? (await getApiBaseUrl()),
    lanBases,
  );
  await saveSettings({
    apiBaseUrl,
    defaults: await getDefaults(),
  });
  return apiBaseUrl;
}

export async function injectContentScript(tabId: number): Promise<void> {
  const file = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
  if (!file) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [file],
    });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (!/Cannot access|The extensions gallery/i.test(text)) {
      console.warn('inject failed', text);
    }
  }
}

export async function sendToFrames<T>(
  tabId: number,
  message: ExtensionMessage,
): Promise<T[]> {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const ids = frames?.map((f) => f.frameId) ?? [0];
  const results: T[] = [];
  for (const frameId of ids) {
    try {
      const response = (await chrome.tabs.sendMessage(tabId, message, {
        frameId,
      })) as T;
      if (response !== undefined) results.push(response);
    } catch {
      /* frame without listener */
    }
  }
  return results;
}

export async function fillActiveTab(resumeId: string): Promise<{
  ok: true;
  ats?: string;
  progress?: FillProgress;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  await injectContentScript(tab.id);

  const [profile, resume, resumeBase64, defaults] = await Promise.all([
    getProfile(),
    getResume(resumeId),
    downloadResumePdf(resumeId),
    getDefaults(),
  ]);
  const cover = await tryDownloadCoverLetterPdf(resumeId);
  const { buildApplicant } = await import('../shared/applicant');
  const applicant = buildApplicant({
    profile,
    resume,
    resumeBase64,
    coverLetterBase64: cover?.base64,
    coverLetterFileName: cover?.filename,
    defaults,
  });

  const responses = await sendToFrames<{
    ok?: boolean;
    skipped?: boolean;
    progress?: FillProgress;
    error?: string;
  }>(tab.id, { type: 'TAB_FILL_APPLICATION', applicant });

  const used = responses.find((r) => r && r.ok && !r.skipped);
  if (used?.error) throw new Error(used.error);
  if (!used) {
    throw new Error('No application form found on this page');
  }
  return { ok: true, ats: used.progress?.ats, progress: used.progress };
}
