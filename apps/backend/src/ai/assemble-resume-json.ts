import type { ResumeData } from 'src/resumes/templates';
import type {
  CompanyEntry,
  ContactEntry,
  CandidateProfileData,
} from '@resume-builder/shared';
import {
  getPrimaryContact,
  sortCompaniesByOrder,
  getMostRecentCompany,
} from '@resume-builder/shared';
import type { ExperienceChunkResult } from './schemas/experience.schema';

export interface AssembleResumeInput {
  name: string;
  contacts: ContactEntry[];
  candidateProfile: CandidateProfileData;
  companies: CompanyEntry[];
  finalTitle: string;
  summary: string;
  skills: Array<{ category: string; items: string[] }>;
  experienceByCompanyId: Map<string, ExperienceChunkResult>;
}

export function assembleResumeJson(input: AssembleResumeInput): ResumeData {
  const primary = getPrimaryContact(input.contacts);
  const sortedCompanies = sortCompaniesByOrder(input.companies);
  const mostRecent = getMostRecentCompany(input.companies);

  const experience = sortedCompanies.map((company) => {
    const chunk = input.experienceByCompanyId.get(company.id);
    const title =
      mostRecent && company.id === mostRecent.id
        ? input.finalTitle
        : company.title;

    return {
      title,
      company: company.company,
      date_range: company.date_range,
      job_type: company.job_type,
      location: company.location || undefined,
      responsibilities: [] as string[],
      achievements: chunk?.achievements ?? [],
      skills: chunk?.skills ?? [],
    };
  });

  return {
    name: input.name,
    title: input.finalTitle,
    contact: {
      address: primary?.address || undefined,
      email: primary?.email || undefined,
      phone: primary?.phone || undefined,
      linkedin: primary?.linkedin || undefined,
    },
    summary: input.summary,
    skills: input.skills,
    experience,
    education: input.candidateProfile.education.map((entry) => ({
      degree: entry.degree,
      institution: entry.institution,
      date_range: entry.date_range,
      location: entry.location || undefined,
    })),
    certifications: input.candidateProfile.certifications,
  };
}
