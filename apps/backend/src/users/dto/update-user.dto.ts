import type { ResumeSettings } from '../../ai/resume-settings';

export class UpdateUserDto {
  email?: string;
  name?: string;
  password?: string;
  role?: 'user' | 'admin';
  template?: 'template1';
  instructions?: string;
  questionsPrompt?: string;
  coverLetterPrompt?: string;
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
