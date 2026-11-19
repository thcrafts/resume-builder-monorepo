import {
  type CandidateProfileData,
  type CompanyEntry,
  type ContactEntry,
} from '@resume-builder/shared';
import { randomUUID } from 'crypto';

const MAX_MISSION_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 4000;
const MAX_STRING_FIELD = 500;

function trimString(value: unknown, maxLength = MAX_STRING_FIELD): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

export function normalizeContacts(contacts: ContactEntry[] | undefined): ContactEntry[] {
  if (!Array.isArray(contacts)) {
    return [];
  }

  const normalized = contacts.map((contact) => ({
    id: trimString(contact.id, 64) || randomUUID(),
    label: trimString(contact.label, 100),
    address: trimString(contact.address),
    email: trimString(contact.email, 320),
    phone: trimString(contact.phone, 50),
    linkedin: trimString(contact.linkedin),
    isPrimary: contact.isPrimary === true,
  }));

  let primarySet = false;
  return normalized.map((contact) => {
    if (contact.isPrimary && !primarySet) {
      primarySet = true;
      return contact;
    }
    return { ...contact, isPrimary: false };
  });
}

export function normalizeCandidateProfile(
  profile: Partial<CandidateProfileData> | undefined,
): CandidateProfileData {
  const education = Array.isArray(profile?.education)
    ? profile.education.map((entry) => ({
        degree: trimString(entry.degree),
        institution: trimString(entry.institution),
        date_range: trimString(entry.date_range, 100),
        location: trimString(entry.location),
      }))
    : [];

  const baselineSkills = Array.isArray(profile?.baselineSkills)
    ? profile.baselineSkills.map((cat) => ({
        category: trimString(cat.category, 100),
        items: Array.isArray(cat.items)
          ? cat.items.map((item) => trimString(item, 100)).filter(Boolean)
          : [],
      }))
    : [];

  return {
    professionalTitle: trimString(profile?.professionalTitle, 200),
    education,
    certifications: Array.isArray(profile?.certifications)
      ? profile.certifications
      : [],
    baselineSkills,
  };
}

export function normalizeCompanies(companies: CompanyEntry[] | undefined): CompanyEntry[] {
  if (!Array.isArray(companies)) {
    return [];
  }

  const normalized = companies.map((company, index) => ({
    id: trimString(company.id, 64) || randomUUID(),
    company: trimString(company.company),
    title: trimString(company.title, 200),
    date_range: trimString(company.date_range, 100),
    job_type: trimString(company.job_type, 100),
    location: trimString(company.location),
    product: trimString(company.product),
    mission: trimString(company.mission, MAX_MISSION_LENGTH),
    context: trimString(company.context, MAX_CONTEXT_LENGTH),
    sortOrder:
      typeof company.sortOrder === 'number' && Number.isFinite(company.sortOrder)
        ? company.sortOrder
        : index,
  }));

  // Highest sortOrder = most recent (shown first on the resume).
  const sorted = normalized.sort((a, b) => b.sortOrder - a.sortOrder);
  return sorted.map((company, index) => ({
    ...company,
    sortOrder: sorted.length - 1 - index,
  }));
}
