import { z } from 'zod';

export const generateResumeSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  roleType: z.string().min(1, 'Role type is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  industry: z.string().optional(),
  aiModel: z.string().optional(),
  aiVersion: z.string().optional(),
});

export type GenerateResumeDto = z.infer<typeof generateResumeSchema>;
