import {
  computeSoftwareEngineeringCareerYears,
  computeYearsOfExperienceFromEducation,
  getMostRecentCompany,
  getPrimaryContact,
  sanitizeFilename,
  sortCompaniesByOrder,
  type CompanyEntry,
} from '@resume-builder/shared';
import { DEFAULT_APPLY_DEFAULTS } from './types';
import type {
  ApplicantPayload,
  ApplyDefaults,
  EducationRow,
  ProfileResponse,
  ResumeListItem,
  WorkHistoryRow,
} from './types';

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function padMonth(value: string): string {
  return value.length === 1 ? `0${value}` : value;
}

const MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

export function normalizeDate(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (iso) {
    return `${iso[1]}-${padMonth(iso[2])}${iso[3] ? `-${padMonth(iso[3])}` : '-01'}`;
  }
  const monthYear = text.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${month}-01`;
  }
  const yearOnly = text.match(/^(19|20)\d{2}$/);
  if (yearOnly) return `${text}-01-01`;
  const numeric = text.match(/^(\d{1,2})[/-](\d{4})$/);
  if (numeric) return `${numeric[2]}-${padMonth(numeric[1])}-01`;
  return text;
}

export function parseDateRange(range: string): {
  startDate: string;
  endDate: string;
  current: boolean;
} {
  const trimmed = range.trim();
  const current = /\b(present|current|now|ongoing)\b/i.test(trimmed);
  const parts = trimmed.split(/\s*(?:-|–|—|\sto\s)\s*/i);
  const startDate = normalizeDate(parts[0] || '');
  const endDate = current ? '' : normalizeDate(parts[1] || '');
  return { startDate, endDate, current };
}

function certLabel(entry: Record<string, unknown>): string {
  const keys = ['name', 'title', 'certification', 'issuer', 'organization'];
  const bits = keys
    .map((key) => (typeof entry[key] === 'string' ? String(entry[key]).trim() : ''))
    .filter(Boolean);
  return bits.join(' — ');
}

function contactFromResumeJson(
  resumeJson: Record<string, unknown> | undefined,
): { github?: string; website?: string; summary?: string } {
  if (!resumeJson) return {};
  const contact =
    resumeJson.contact && typeof resumeJson.contact === 'object'
      ? (resumeJson.contact as Record<string, unknown>)
      : {};
  const summary =
    typeof resumeJson.summary === 'string' ? resumeJson.summary : undefined;
  return {
    github: typeof contact.github === 'string' ? contact.github : undefined,
    website:
      typeof contact.website === 'string'
        ? contact.website
        : typeof contact.portfolio === 'string'
          ? contact.portfolio
          : undefined,
    summary,
  };
}

export function buildApplicant(input: {
  profile: ProfileResponse;
  resume: ResumeListItem;
  resumeBase64: string;
  coverLetterBase64?: string;
  coverLetterFileName?: string;
  defaults?: ApplyDefaults;
}): ApplicantPayload {
  const { profile, resume } = input;
  const { firstName, lastName } = splitName(profile.name || '');
  const contact = getPrimaryContact(profile.contacts);
  const extra = contactFromResumeJson(resume.resumeJson);
  const companies = sortCompaniesByOrder(
    (profile.companies ?? []).map(
      (company): CompanyEntry => ({
        id: company.id,
        company: company.company,
        title: company.title,
        date_range: company.date_range,
        job_type: '',
        location: company.location,
        product: company.product || '',
        mission: company.mission || '',
        context: company.context,
        sortOrder: company.sortOrder ?? 0,
      }),
    ),
  );
  const recent = getMostRecentCompany(companies);

  const workHistory: WorkHistoryRow[] = companies.map((company) => {
    const dates = parseDateRange(company.date_range || '');
    const responsibilities = [company.mission, company.product, company.context]
      .filter((part) => typeof part === 'string' && part.trim())
      .join('\n');
    return {
      company: company.company,
      title: company.title,
      location: company.location || '',
      responsibilities,
      startDate: dates.startDate,
      endDate: dates.endDate,
      current: dates.current,
    };
  });

  const education: EducationRow[] = (profile.candidateProfile?.education ?? []).map(
    (entry) => ({
      degree: entry.degree || '',
      institution: entry.institution || '',
      dateRange: entry.date_range || '',
      location: entry.location || '',
    }),
  );

  const certifications = (profile.candidateProfile?.certifications ?? [])
    .map((entry) => certLabel(entry))
    .filter(Boolean);

  const years =
    (typeof profile.summaryExperienceYears === 'number' &&
    Number.isFinite(profile.summaryExperienceYears)
      ? profile.summaryExperienceYears
      : null) ??
    computeSoftwareEngineeringCareerYears(
      companies.map((c) => ({ title: c.title, date_range: c.date_range })),
    ) ??
    computeYearsOfExperienceFromEducation(
      (profile.candidateProfile?.education ?? []).map((entry) => ({
        degree: entry.degree || '',
        institution: entry.institution || '',
        date_range: entry.date_range || '',
        location: entry.location || '',
      })),
    );
  const resumeFileName = `${sanitizeFilename(profile.name || 'resume')}.pdf`;

  return {
    firstName,
    lastName,
    fullName: profile.name || `${firstName} ${lastName}`.trim(),
    email: contact?.email || profile.email || '',
    phone: contact?.phone || '',
    address: contact?.address || '',
    linkedin: contact?.linkedin || '',
    github: extra.github || '',
    website: extra.website || '',
    headline: profile.candidateProfile?.professionalTitle || '',
    currentCompany: recent?.company || '',
    yearsOfExperience: years != null ? String(years) : '',
    resumeFileName,
    resumeBase64: input.resumeBase64,
    coverLetterFileName: input.coverLetterFileName,
    coverLetterBase64: input.coverLetterBase64,
    coverLetterText: resume.coverLetter,
    summary: extra.summary,
    workHistory,
    education,
    certifications,
    answers: (resume.answers ?? []).map((pair) => ({
      question: String(pair.question),
      answer: String(pair.answer),
    })),
    jobDescription: resume.jobDescription || '',
    resumeId: resume._id,
    companyName: resume.companyName,
    roleType: resume.roleType,
    defaults: input.defaults ?? DEFAULT_APPLY_DEFAULTS,
  };
}

export function semanticValue(
  key: import('./types').SemanticKey,
  applicant: ApplicantPayload,
): string | boolean | null {
  const { defaults } = applicant;
  switch (key) {
    case 'first_name':
      return applicant.firstName;
    case 'last_name':
      return applicant.lastName;
    case 'full_name':
      return applicant.fullName;
    case 'email':
      return applicant.email;
    case 'phone':
      return applicant.phone;
    case 'address':
      return applicant.address;
    case 'linkedin':
      return applicant.linkedin;
    case 'github':
      return applicant.github;
    case 'website':
      return applicant.website;
    case 'headline':
      return applicant.headline;
    case 'current_company':
      return applicant.currentCompany;
    case 'cover_letter_text':
      return applicant.coverLetterText || '';
    case 'additional_info':
      return applicant.summary || applicant.coverLetterText || '';
    case 'work_auth':
      return defaults.workAuthorization;
    case 'relocate':
      return defaults.relocate;
    case 'start_date':
      return defaults.startDate;
    case 'sms_consent':
      return defaults.smsOptIn;
    case 'heard_about':
      return defaults.heardAbout;
    case 'worked_before':
      return defaults.workedHereBefore;
    case 'years_experience':
      return applicant.yearsOfExperience;
    default:
      return null;
  }
}
