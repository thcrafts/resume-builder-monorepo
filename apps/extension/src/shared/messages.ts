import type {
  ApplicantPayload,
  ApplyCapture,
  ApplyDefaults,
  FillProgress,
  PageCapture,
  QuestionCapture,
  ResumeListItem,
  SessionUser,
} from './types';

export type ExtensionMessage =
  | { type: 'PING' }
  | { type: 'GET_SESSION' }
  | { type: 'PROBE_API'; apiBaseUrl?: string; lanBases?: string[] }
  | { type: 'LOGIN'; email: string; password: string; apiBaseUrl: string; lanBases?: string[] }
  | { type: 'LOGOUT' }
  | { type: 'SAVE_SETTINGS'; apiBaseUrl: string; defaults: ApplyDefaults; lanBases?: string[] }
  | { type: 'LIST_RESUMES'; lanBases?: string[] }
  | { type: 'GET_PAGE_CONTEXT' }
  | { type: 'GET_CAPTURE' }
  | { type: 'FILL_ACTIVE_TAB'; resumeId: string }
  | { type: 'TAB_GET_PAGE_CONTEXT' }
  | { type: 'TAB_CAPTURE_JOB' }
  | { type: 'TAB_CAPTURE_QUESTIONS' }
  | { type: 'TAB_SHOW_OVERLAY'; title: string; detail: string }
  | { type: 'TAB_FILL_APPLICATION'; applicant: ApplicantPayload }
  | { type: 'FILL_APPLICATION'; applicant: ApplicantPayload }
  | { type: 'ANSWER_QUESTIONS'; resumeId: string; questions: string[] }
  | { type: 'FILL_PROGRESS'; progress: FillProgress }
  | { type: 'CAPTURE_PROGRESS'; message: string; capture?: ApplyCapture };

export type SessionResponse = {
  apiBaseUrl: string;
  token: string | null;
  user: SessionUser | null;
  defaults: ApplyDefaults;
};

export type CaptureResponse = {
  capture: ApplyCapture | null;
};

export type PageCaptureResponse = PageCapture;
export type QuestionCaptureResponse = QuestionCapture;

export type ProbeApiResponse = {
  apiBaseUrl: string;
};

export type LoginResponse = {
  ok: true;
  user: SessionUser;
  apiBaseUrl: string;
};

export type ListResumesResponse = {
  resumes: ResumeListItem[];
};

export type AnswerQuestionsResponse = {
  pairs: Array<{ question: string; answer: string }>;
};

export type FillStartResponse = {
  ok: true;
  ats?: string;
};
