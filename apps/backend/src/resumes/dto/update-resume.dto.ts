import { z } from 'zod';

export const updateResumeSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required'),
  roleType: z.string().trim().min(1, 'Role type is required'),
});

export type UpdateResumeDto = z.infer<typeof updateResumeSchema>;
