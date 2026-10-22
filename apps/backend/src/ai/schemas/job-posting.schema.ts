export const jobPostingJsonSchema = {
  type: 'object',
  properties: {
    companyName: { type: 'string', minLength: 1 },
    roleType: { type: 'string', minLength: 1 },
    jobDescription: { type: 'string', minLength: 1 },
  },
  required: ['companyName', 'roleType', 'jobDescription'],
  additionalProperties: false,
} as const;

export interface JobPostingExtract {
  companyName: string;
  roleType: string;
  jobDescription: string;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.replace(/\s+/g, ' ').trim() || '';
    if (trimmed) return trimmed;
  }
  return '';
}

export function parseJobPostingResult(
  raw: unknown,
  fallback: JobPostingExtract,
): JobPostingExtract {
  const data =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const companyName = firstNonEmpty(
    String(data.companyName ?? ''),
    fallback.companyName,
    'Unknown company',
  );
  const roleType = firstNonEmpty(
    String(data.roleType ?? ''),
    fallback.roleType,
    'Software Engineer',
  );
  const jobDescription = firstNonEmpty(
    String(data.jobDescription ?? ''),
    fallback.jobDescription,
  );

  if (!jobDescription) {
    throw new Error('Could not extract a job description from this page');
  }

  return { companyName, roleType, jobDescription };
}
