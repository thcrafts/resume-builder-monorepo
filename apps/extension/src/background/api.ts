import {
  NEST_UNREACHABLE_HINT,
  isViteDevProxyUrl,
  type ProfileResponse,
  type ResumeListItem,
  type SessionUser,
} from '../shared/types';
import { getApiBaseUrl, getToken } from './storage';

const NEST_PROBE_ORDER = [
  'http://127.0.0.1:3001',
  'http://localhost:3001',
] as const;

function looksLikeHtml(text: string): boolean {
  return /<!DOCTYPE html/i.test(text) || /<html[\s>]/i.test(text);
}

function abortAfter(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function isNestJsonOk(baseUrl: string): Promise<boolean> {
  const base = baseUrl.replace(/\/$/, '');
  if (isViteDevProxyUrl(base)) return false;
  try {
    const res = await fetch(`${base}/api`, {
      method: 'GET',
      signal: abortAfter(4000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    if (looksLikeHtml(text)) return false;
    const json = JSON.parse(text) as { status?: string };
    return json.status === 'ok';
  } catch {
    return false;
  }
}

export async function probeNestApi(
  preferred?: string,
  lanBases: string[] = [],
): Promise<string> {
  const extra = preferred?.replace(/\/$/, '') || '';
  const candidates: string[] = [...NEST_PROBE_ORDER];
  for (const base of [...lanBases, extra]) {
    const trimmed = base.replace(/\/$/, '');
    if (!trimmed || isViteDevProxyUrl(trimmed) || candidates.includes(trimmed)) {
      continue;
    }
    candidates.push(trimmed);
  }
  for (const base of candidates) {
    if (await isNestJsonOk(base)) return base;
  }
  throw new Error(NEST_UNREACHABLE_HINT);
}

async function apiUrl(path: string): Promise<string> {
  const base = await getApiBaseUrl();
  return `${base.replace(/\/$/, '')}${path}`;
}

async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(json.message)) return json.message.join(', ');
    if (json.message) return json.message;
  } catch {
    /* not JSON */
  }
  if (looksLikeHtml(text)) {
    return `Got a webpage (HTTP ${res.status}) instead of Nest JSON. ${NEST_UNREACHABLE_HINT}`;
  }
  return text.slice(0, 200) || `HTTP ${res.status}`;
}

export async function login(
  email: string,
  password: string,
  apiBaseUrl: string,
): Promise<{ user: SessionUser; access_token: string }> {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ user: SessionUser; access_token: string }>;
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch(await apiUrl('/api/users/profile'), {
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<ProfileResponse>;
}

export async function listResumes(): Promise<ResumeListItem[]> {
  const res = await fetch(await apiUrl('/api/resumes'), {
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<ResumeListItem[]>;
}

export async function getResume(id: string): Promise<ResumeListItem> {
  const res = await fetch(await apiUrl(`/api/resumes/${id}`), {
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<ResumeListItem>;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function downloadResumePdf(id: string): Promise<string> {
  const res = await fetch(await apiUrl(`/api/resumes/${id}/download`), {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return blobToBase64(await res.blob());
}

export async function tryDownloadCoverLetterPdf(
  id: string,
): Promise<{ base64: string; filename: string } | null> {
  const res = await fetch(
    await apiUrl(`/api/resumes/${id}/download-cover-letter?format=pdf`),
    { headers: await authHeaders() },
  );
  if (!res.ok) return null;
  const base64 = await blobToBase64(await res.blob());
  return { base64, filename: 'cover-letter.pdf' };
}

export async function answerQuestions(
  resumeId: string,
  questionsText: string,
): Promise<{ questions: string[]; answers: string[] }> {
  const res = await fetch(await apiUrl('/api/resumes/answer-questions'), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ resumeId, questions: questionsText }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{ questions: string[]; answers: string[] }>;
}

export async function extractJobPosting(input: {
  pageText: string;
  pageTitle?: string;
  pageUrl?: string;
  companyGuess?: string;
  roleGuess?: string;
}): Promise<{
  companyName: string;
  roleType: string;
  jobDescription: string;
}> {
  const res = await fetch(await apiUrl('/api/resumes/extract-job-posting'), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<{
    companyName: string;
    roleType: string;
    jobDescription: string;
  }>;
}

export async function startResumeGeneration(input: {
  companyName: string;
  roleType: string;
  jobDescription: string;
  aiModel?: string;
  aiVersion?: string;
}): Promise<string> {
  const res = await fetch(await apiUrl('/api/resumes/generate'), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const text = await res.text();
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    let event: { type?: string; message?: string; resumeId?: string };
    try {
      event = JSON.parse(line.slice(6)) as {
        type?: string;
        message?: string;
        resumeId?: string;
      };
    } catch {
      continue;
    }
    if (event.type === 'error') {
      throw new Error(event.message || 'Resume generation failed');
    }
    if (event.type === 'started' && event.resumeId) {
      return event.resumeId;
    }
  }
  throw new Error('Did not receive a resume id from generate');
}

export async function waitForResume(
  resumeId: string,
  timeoutMs = 240000,
): Promise<ResumeListItem> {
  const deadline = Date.now() + timeoutMs;
  let last: ResumeListItem | null = null;
  while (Date.now() < deadline) {
    last = await getResume(resumeId);
    if (last.status === 'completed') return last;
    if (last.status === 'failed') {
      throw new Error(last.failureMessage || 'Resume generation failed');
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error(
    'Resume is still generating. Wait, then press the questions hotkey.',
  );
}
