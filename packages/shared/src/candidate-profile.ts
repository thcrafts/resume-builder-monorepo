export interface ContactEntry {
  id: string;
  label?: string;
  address?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isPrimary?: boolean;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  date_range: string;
  location?: string;
}

export interface CertificationEntry {
  name?: string;
  title?: string;
  certification?: string;
  issuer?: string;
  organization?: string;
  authority?: string;
  date?: string;
  date_range?: string;
  issued_date?: string;
  year?: string;
}

export interface SkillCategoryEntry {
  category: string;
  items: string[];
}

export interface CandidateProfileData {
  professionalTitle: string;
  education: EducationEntry[];
  certifications: CertificationEntry[];
  baselineSkills: SkillCategoryEntry[];
}

export interface CompanyEntry {
  id: string;
  company: string;
  title: string;
  date_range: string;
  job_type: string;
  location?: string;
  product: string;
  mission: string;
  context?: string;
  sortOrder: number;
}

export interface UserCandidateProfile {
  name: string;
  contacts: ContactEntry[];
  candidateProfile: CandidateProfileData;
  companies: CompanyEntry[];
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
}

export const TITLE_SIMILARITY_THRESHOLD = 0.8;

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCandidateProfile(
  profile: Partial<UserCandidateProfile> | null | undefined,
): ProfileValidationResult {
  const errors: string[] = [];

  if (!profile) {
    return { valid: false, errors: ['Profile data is missing'] };
  }

  const contacts = Array.isArray(profile.contacts) ? profile.contacts : [];
  const primaryContacts = contacts.filter((c) => c.isPrimary === true);

  if (primaryContacts.length !== 1) {
    errors.push('Exactly one contact must be marked as primary');
  } else if (!isNonEmpty(primaryContacts[0].email)) {
    errors.push('Primary contact must include an email address');
  }

  const candidateProfile = profile.candidateProfile;
  if (!candidateProfile || !isNonEmpty(candidateProfile.professionalTitle)) {
    errors.push('Professional title is required');
  }

  const education = candidateProfile?.education ?? [];
  if (!Array.isArray(education) || education.length < 1) {
    errors.push('At least one education entry is required');
  } else {
    education.forEach((entry, index) => {
      if (!isNonEmpty(entry.degree)) {
        errors.push(`Education ${index + 1}: degree is required`);
      }
      if (!isNonEmpty(entry.institution)) {
        errors.push(`Education ${index + 1}: institution is required`);
      }
      if (!isNonEmpty(entry.date_range)) {
        errors.push(`Education ${index + 1}: date range is required`);
      }
    });
  }

  const baselineSkills = candidateProfile?.baselineSkills ?? [];
  const hasSkillItems = baselineSkills.some(
    (cat) => Array.isArray(cat.items) && cat.items.some((item) => isNonEmpty(item)),
  );
  if (!Array.isArray(baselineSkills) || baselineSkills.length < 1 || !hasSkillItems) {
    errors.push('At least one baseline skill category with items is required');
  }

  const companies = Array.isArray(profile.companies) ? profile.companies : [];
  if (companies.length < 1) {
    errors.push('At least one company is required');
  } else {
    companies.forEach((company, index) => {
      const label = `Company ${index + 1}`;
      if (!isNonEmpty(company.company)) {
        errors.push(`${label}: company name is required`);
      }
      if (!isNonEmpty(company.title)) {
        errors.push(`${label}: job title is required`);
      }
      if (!isNonEmpty(company.date_range)) {
        errors.push(`${label}: date range is required`);
      }
      if (!isNonEmpty(company.product)) {
        errors.push(`${label}: product is required`);
      }
      if (!isNonEmpty(company.mission)) {
        errors.push(`${label}: mission is required`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateCompanyFieldsForSave(
  companies: CompanyEntry[] | undefined,
): ProfileValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(companies)) {
    return { valid: true, errors };
  }

  companies.forEach((company, index) => {
    const label = `Company ${index + 1}`;
    if (!isNonEmpty(company.product)) {
      errors.push(`${label}: product is required`);
    }
    if (!isNonEmpty(company.mission)) {
      errors.push(`${label}: mission is required`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function getPrimaryContact(
  contacts: ContactEntry[] | undefined,
): ContactEntry | undefined {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return undefined;
  }
  return contacts.find((c) => c.isPrimary) ?? contacts[0];
}

export function sortCompaniesByOrder(companies: CompanyEntry[]): CompanyEntry[] {
  return [...companies].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
}

export function getMostRecentCompany(companies: CompanyEntry[]): CompanyEntry | undefined {
  const sorted = sortCompaniesByOrder(companies);
  return sorted[0];
}
