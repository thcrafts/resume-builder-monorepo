import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  clearSession,
  getApiBaseUrl,
  getDefaults,
  getToken,
  getUser,
} from '../background/storage';
import { discoverLanApiBases } from '../shared/lan';
import { pickResumeByPage } from '../shared/fuzzy';
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_APPLY_DEFAULTS,
  type ApplyCapture,
  type ApplyDefaults,
  type FillProgress,
  type PageContext,
  type ResumeListItem,
  type SessionUser,
} from '../shared/types';

type Session = {
  apiBaseUrl: string;
  token: string | null;
  user: SessionUser | null;
  defaults: ApplyDefaults;
};

async function requestApiOrigin(apiBaseUrl: string): Promise<void> {
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

function sendError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/unknown message/i.test(text)) {
    return 'Reload this extension on chrome://extensions (click Refresh), then open the popup again.';
  }
  return text;
}

async function send<T>(message: unknown, timeoutMs = 25000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Extension background did not respond'));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        clearTimeout(timer);
        const err = chrome.runtime.lastError?.message;
        if (err) {
          reject(new Error(err));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function Popup() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [defaults, setDefaults] = useState<ApplyDefaults>(DEFAULT_APPLY_DEFAULTS);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [page, setPage] = useState<PageContext | null>(null);
  const [capture, setCapture] = useState<ApplyCapture | null>(null);
  const [shortcuts, setShortcuts] = useState<chrome.commands.Command[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState(
    'Sign in once. Then use hotkeys on the job page — no web app needed.',
  );

  const load = useCallback(async () => {
    try {
      const [url, token, user, storedDefaults, lanBases] = await Promise.all([
        getApiBaseUrl(),
        getToken(),
        getUser(),
        getDefaults(),
        discoverLanApiBases(),
      ]);
      setApiBaseUrl(url);
      setDefaults(storedDefaults);
      setSession({
        apiBaseUrl: url,
        token,
        user,
        defaults: storedDefaults,
      });
      if (!token) {
        try {
          const probe = await send<{ apiBaseUrl?: string; error?: string }>(
            { type: 'PROBE_API', apiBaseUrl: url, lanBases },
            15000,
          );
          if (probe?.apiBaseUrl) setApiBaseUrl(probe.apiBaseUrl);
          else if (probe?.error) setError(sendError(new Error(probe.error)));
        } catch (error) {
          setError(sendError(error));
        }
        return;
      }

      try {
        const listed = await send<{ resumes?: ResumeListItem[]; error?: string }>(
          { type: 'LIST_RESUMES', lanBases },
        );
        if (listed?.error) throw new Error(listed.error);
        const items = listed.resumes || [];
        setResumes(items);
        const captured = await send<{ capture?: ApplyCapture | null }>(
          { type: 'GET_CAPTURE' },
          4000,
        );
        if (captured?.capture) setCapture(captured.capture);
        try {
          const context = await send<PageContext & { error?: string }>(
            { type: 'GET_PAGE_CONTEXT' },
            4000,
          );
          if (context && !context.error) {
            setPage(context);
          }
          if (captured?.capture?.resumeId) {
            setResumeId(captured.capture.resumeId);
          } else if (context && !context.error && items.length) {
            const index = pickResumeByPage(
              items,
              context.companyGuess,
              context.roleGuess,
            );
            setResumeId(items[index]._id);
          } else if (items[0]) {
            setResumeId(items[0]._id);
          }
        } catch {
          if (captured?.capture?.resumeId) setResumeId(captured.capture.resumeId);
          else if (items[0]) setResumeId(items[0]._id);
        }
      } catch (error) {
        setError(sendError(error));
      }
    } catch (error) {
      setSession({
        apiBaseUrl: DEFAULT_API_BASE_URL,
        token: null,
        user: null,
        defaults: DEFAULT_APPLY_DEFAULTS,
      });
      setError(sendError(error));
    }
  }, []);

  useEffect(() => {
    void load();
    void chrome.commands.getAll().then(setShortcuts).catch(() => undefined);
    const listener = (message: {
      type?: string;
      progress?: FillProgress;
      message?: string;
      capture?: ApplyCapture;
    }) => {
      if (message.type === 'FILL_PROGRESS' && message.progress) {
        const p = message.progress;
        setLog(
          `${p.message}${p.done ? `\nFilled ${p.filled}, skipped ${p.skipped}.` : ''}`,
        );
      }
      if (message.type === 'CAPTURE_PROGRESS') {
        if (message.capture) {
          setCapture(message.capture);
          if (message.capture.resumeId) setResumeId(message.capture.resumeId);
        }
        if (message.message) setLog(message.message);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [load]);

  const selected = useMemo(
    () => resumes.find((r) => r._id === resumeId),
    [resumes, resumeId],
  );

  const hotkey = (name: string, fallback: string) =>
    shortcuts.find((command) => command.name === name)?.shortcut || fallback;

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const lanBases = await discoverLanApiBases();
      await requestApiOrigin(apiBaseUrl);
      for (const base of lanBases) {
        try {
          await requestApiOrigin(base);
        } catch {
          /* optional LAN origin */
        }
      }
      const result = await send<{
        ok?: boolean;
        apiBaseUrl?: string;
        error?: string;
      }>({
        type: 'LOGIN',
        email,
        password,
        apiBaseUrl,
        lanBases,
      });
      if (result?.error || !result?.ok) {
        throw new Error(result?.error || 'Sign in failed');
      }
      if (result.apiBaseUrl) setApiBaseUrl(result.apiBaseUrl);
      setPassword('');
      await load();
    } catch (error) {
      setError(sendError(error));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDefaults() {
    setBusy(true);
    setError('');
    try {
      const lanBases = await discoverLanApiBases();
      await requestApiOrigin(apiBaseUrl);
      const result = await send<{ ok?: boolean; apiBaseUrl?: string; error?: string }>(
        {
          type: 'SAVE_SETTINGS',
          apiBaseUrl,
          defaults,
          lanBases,
        },
      );
      if (result?.error || !result?.ok) {
        throw new Error(result?.error || 'Could not save defaults');
      }
      if (result.apiBaseUrl) setApiBaseUrl(result.apiBaseUrl);
      setLog('Defaults saved.');
    } catch (error) {
      setError(sendError(error));
    } finally {
      setBusy(false);
    }
  }

  async function onFill() {
    if (!resumeId) {
      setError('Pick a resume first');
      return;
    }
    setBusy(true);
    setError('');
    setLog('Filling this tab like a person. Will not submit.');
    try {
      const result = await send<{
        ok?: boolean;
        error?: string;
        progress?: FillProgress;
      }>({
        type: 'FILL_ACTIVE_TAB',
        resumeId,
      });
      if (result?.error || !result?.ok) {
        setError(sendError(new Error(result?.error || 'Fill failed')));
        return;
      }
      const p = result.progress;
      setLog(
        p
          ? `${p.message}\nFilled ${p.filled}, skipped ${p.skipped}. Review green/yellow/red fields, then submit yourself.`
          : 'Fill finished. Review the page, then submit yourself.',
      );
    } catch (error) {
      setError(sendError(error));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="wrap">
        <h1>Resume Builder Apply</h1>
        <p className="sub">Loading…</p>
      </div>
    );
  }

  if (!session.token) {
    return (
      <form className="wrap" onSubmit={onLogin}>
        <div>
          <h1>Resume Builder Apply</h1>
          <p className="sub">Sign in with the same account as the web app.</p>
        </div>
        <label>
          API URL (Nest on port 3001 — do not use :5173)
          <input
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder={DEFAULT_API_BASE_URL}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    );
  }

  return (
    <div className="wrap">
      <div>
        <h1>Resume Builder Apply</h1>
        <p className="sub">
          {session.user?.name || session.user?.email} · fills like a person · never
          submits
        </p>
      </div>

      <div className="card status">
        <strong>Hotkeys — skip the web app after sign-in</strong>
        <div>
          <kbd>{hotkey('capture-job', 'Alt+Shift+1')}</kbd> Job page: capture
          company, title, description and generate a tailored resume
        </div>
        <div>
          <kbd>{hotkey('capture-questions', 'Alt+Shift+2')}</kbd> Application
          page: capture questions and generate answers
        </div>
        <div>
          <kbd>{hotkey('fill-application', 'Alt+Shift+3')}</kbd> Fill this form
          (does not submit)
        </div>
        <div className="rb-hint">Remap in chrome://extensions/shortcuts</div>
      </div>

      {capture?.companyName || capture?.roleType ? (
        <div className="banner">
          <div>
            Capture: <strong>{capture.status}</strong>
          </div>
          <div>
            {capture.companyName}
            {capture.roleType ? ` — ${capture.roleType}` : ''}
          </div>
          {capture.answers.length ? (
            <div>{capture.answers.length} answers ready</div>
          ) : capture.questions.length ? (
            <div>{capture.questions.length} questions captured</div>
          ) : null}
          {capture.failureMessage ? (
            <div className="error">{capture.failureMessage}</div>
          ) : null}
        </div>
      ) : null}

      {page ? (
        <div className="banner">
          <div>
            Detected ATS: <strong>{page.ats}</strong>
          </div>
          <div>
            {page.isApplyPage ? 'Application form found' : 'No form detected yet'}
          </div>
          {page.companyGuess ? <div>{page.companyGuess}</div> : null}
        </div>
      ) : null}

      <label>
        Tailored resume
        <select
          className="resume"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
        >
          {resumes.length === 0 ? (
            <option value="">No completed resumes</option>
          ) : null}
          {resumes.map((resume) => (
            <option key={resume._id} value={resume._id}>
              {resume.companyName} — {resume.roleType}
            </option>
          ))}
        </select>
      </label>
      {selected?.jobDescription ? (
        <div className="status">Using JD from this resume for Q&amp;A.</div>
      ) : null}

      <div className="actions">
        <button type="button" onClick={() => void onFill()} disabled={busy || !resumeId}>
          {busy ? 'Filling…' : 'Fill this tab'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            void clearSession().then(() => {
              setResumes([]);
              setResumeId('');
              setPage(null);
              return load();
            })
          }
        >
          Log out
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      <div className="card status">{log}</div>

      <details>
        <summary>Application defaults</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <label>
            API URL (Nest :3001, not Vite :5173)
            <input
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder={DEFAULT_API_BASE_URL}
            />
          </label>
          <label>
            Work authorization
            <textarea
              value={defaults.workAuthorization}
              onChange={(e) =>
                setDefaults({ ...defaults, workAuthorization: e.target.value })
              }
              placeholder="Yes, I am authorized to work in the US without sponsorship."
            />
          </label>
          <div className="row">
            <label>
              Relocate
              <select
                value={defaults.relocate}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    relocate: e.target.value as ApplyDefaults['relocate'],
                  })
                }
              >
                <option value="">Skip</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              Available to start
              <input
                type="date"
                value={defaults.startDate}
                onChange={(e) =>
                  setDefaults({ ...defaults, startDate: e.target.value })
                }
              />
            </label>
          </div>
          <label>
            How did you hear about us?
            <input
              value={defaults.heardAbout}
              onChange={(e) =>
                setDefaults({ ...defaults, heardAbout: e.target.value })
              }
            />
          </label>
          <div className="row">
            <label>
              Worked here before
              <select
                value={defaults.workedHereBefore}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    workedHereBefore: e.target.value as 'yes' | 'no',
                  })
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={defaults.smsOptIn}
                onChange={(e) =>
                  setDefaults({ ...defaults, smsOptIn: e.target.checked })
                }
              />
              SMS recruiting opt-in
            </label>
          </div>
          <button type="button" className="secondary" onClick={() => void onSaveDefaults()}>
            Save defaults
          </button>
        </div>
      </details>
    </div>
  );
}
