import type { ResumeSettings } from '../../ai/resume-settings';
import type {
  CandidateProfileData,
  CompanyEntry,
  ContactEntry,
} from '@resume-builder/shared';

export class UpdateUserDto {
  email?: string;
  name?: string;
  password?: string;
  role?: 'user' | 'admin';
  template?: 'template1';
  instructions?: string;
  questionsPrompt?: string;
  coverLetterPrompt?: string;
  experiencePrompt?: string;
  contacts?: ContactEntry[];
  candidateProfile?: Partial<CandidateProfileData>;
  companies?: CompanyEntry[];
  /** Manual override / cached SE years (number only). */
  summaryExperienceYears?: number | null;
  defaultAiModel?: string;
  defaultAiVersion?: string;
  defaultGenerateFromJson?: boolean;
  defaultFromJsonAiModel?: string;
  defaultFromJsonAiVersion?: string;
  openrouterApiKey?: string;
  clearOpenrouterApiKey?: boolean;
  currentPassword?: string;
  newPassword?: string;
  resumeSettings?: Partial<ResumeSettings>;
}
