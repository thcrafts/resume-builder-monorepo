import { z } from 'zod';

export const extractJobPostingSchema = z.object({
  pageText: z.string().min(1, 'Page text is required').max(40000),
  pageTitle: z.string().optional(),
  pageUrl: z.string().optional(),
  companyGuess: z.string().optional(),
  roleGuess: z.string().optional(),
});

export type ExtractJobPostingDto = z.infer<typeof extractJobPostingSchema>;
