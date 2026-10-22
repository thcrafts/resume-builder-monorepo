export type AtsId =
  | 'greenhouse'
  | 'lever'
  | 'workable'
  | 'ashby'
  | 'applytojob'
  | 'paylocity'
  | 'generic';

export type SemanticKey =
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'headline'
  | 'current_company'
  | 'resume'
  | 'cover_letter'
  | 'cover_letter_text'
  | 'additional_info'
  | 'work_auth'
  | 'relocate'
  | 'start_date'
  | 'sms_consent'
  | 'heard_about'
  | 'worked_before'
  | 'years_experience';

export interface ApplyDefaults {
  workAuthorization: string;
  relocate: '' | 'yes' | 'no';
  startDate: string;
  heardAbout: string;
  smsOptIn: boolean;
  workedHereBefore: 'yes' | 'no';
}

export const DEFAULT_APPLY_DEFAULTS: ApplyDefaults = {
  workAuthorization: '',
  relocate: '',
  startDate: '',
  heardAbout: '',
  smsOptIn: false,
  workedHereBefore: 'no',
};

/** Nest origin. Never use :5173 — that is the web app proxy and sharing it breaks resume fetch. */
export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';
export const VITE_PROXY_API_BASE_URL = 'http://localhost:5173';
export const LEGACY_API_BASE_URL = VITE_PROXY_API_BASE_URL;

export const NEST_UNREACHABLE_HINT =
  'Could not reach Nest on 127.0.0.1:3001 or localhost:3001. Set API URL to the Vite log target, e.g. http://192.168.x.x:3001. Do not use :5173.';

export function isViteDevProxyUrl(url: string): boolean {
  const trimmed = url.replace(/\/$/, '');
  if (trimmed === VITE_PROXY_API_BASE_URL || trimmed === LEGACY_API_BASE_URL) {
    return true;
  }
  try {
    const port = new URL(url).port;
    return port === '5173' || port === '5174';
  } catch {
    return /:517[34]/.test(url);
  }
}

export interface WorkHistoryRow {
  company: string;
  title: string;
  location: string;
  responsibilities: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface EducationRow {
  degree: string;
  institution: string;
  dateRange: string;
  location: string;
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface ApplicantPayload {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  github: string;
  website: string;
  headline: string;
  currentCompany: string;
  yearsOfExperience: string;
  resumeFileName: string;
  resumeBase64: string;
  coverLetterFileName?: string;
  coverLetterBase64?: string;
  coverLetterText?: string;
  summary?: string;
  workHistory: WorkHistoryRow[];
  education: EducationRow[];
  certifications: string[];
  answers: QaPair[];
  jobDescription: string;
  resumeId: string;
  companyName: string;
  roleType: string;
  defaults: ApplyDefaults;
}

export interface ProfileResponse {
  _id: string;
  email: string;
  name: string;
  contacts?: Array<{
    id: string;
    label?: string;
    address?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    isPrimary?: boolean;
  }>;
  candidateProfile?: {
    professionalTitle?: string;
    education?: Array<{
      degree?: string;
      institution?: string;
      date_range?: string;
      location?: string;
    }>;
    certifications?: Array<Record<string, unknown>>;
    yearsOfExperience?: number;
  };
  companies?: Array<{
    id: string;
    company: string;
    title: string;
    date_range: string;
    location?: string;
    product?: string;
    mission?: string;
    context?: string;
    sortOrder?: number;
  }>;
  defaultAiModel?: string;
  defaultAiVersion?: string;
}

export interface ResumeListItem {
  _id: string;
  companyName: string;
  roleType: string;
  jobDescription?: string;
  status?: string;
  failureMessage?: string;
  coverLetter?: string;
  answers?: QaPair[];
  resumeJson?: Record<string, unknown>;
  createdAt?: string;
}

export interface SessionUser {
  _id?: string;
  email: string;
  name: string;
}

export interface FillProgress {
  ats: AtsId;
  step: number;
  message: string;
  filled: number;
  skipped: number;
  done?: boolean;
  stoppedBeforeSubmit?: boolean;
  error?: string;
}

export interface PageContext {
  url: string;
  title: string;
  ats: AtsId;
  companyGuess: string;
  roleGuess: string;
  isApplyPage: boolean;
}

export interface PageCapture {
  pageText: string;
  pageTitle: string;
  pageUrl: string;
  companyGuess: string;
  roleGuess: string;
  hasForm: boolean;
}

export interface QuestionCapture {
  questions: string[];
  pageText: string;
  hasForm: boolean;
}

export type CaptureStatus =
  | 'idle'
  | 'extracting'
  | 'generating'
  | 'ready'
  | 'answering'
  | 'answered'
  | 'failed';

export interface ApplyCapture {
  sourceUrl: string;
  companyName: string;
  roleType: string;
  jobDescription: string;
  resumeId: string | null;
  status: CaptureStatus;
  questions: string[];
  answers: QaPair[];
  failureMessage?: string;
  updatedAt: number;
}
