import { normalizeTechStackSkills } from './tech-stack-skills';

export interface JdAlignmentRequirements {
  languages: string[];
  requiredSkills: string[];
  experienceThemes: string[];
  experienceRequirements: string[];
}

const COMMON_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'Go',
  'Golang',
  'C#',
  'C++',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Rust',
  'Scala',
  'SQL',
] as const;

const COMMON_SKILLS = [
  'React',
  'Angular',
  'Vue',
  'Next.js',
  'Node.js',
  'NestJS',
  'Express',
  'Django',
  'FastAPI',
  'Spring',
  'AWS',
  'Azure',
  'GCP',
  'Kubernetes',
  'Docker',
  'Terraform',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'Kafka',
  'GraphQL',
  'REST',
  'Microservices',
  'CI/CD',
  'Git',
  'Linux',
  'Agile',
  'Scrum',
  'Machine Learning',
  'LLM',
  'OpenAI',
  'TensorFlow',
  'PyTorch',
] as const;

const EXPERIENCE_THEME_PATTERNS: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\b(lead|leading|mentor|mentoring)\b/i, theme: 'technical leadership' },
  { pattern: /\b(architect|architecture)\b/i, theme: 'system architecture' },
  { pattern: /\b(scale|scaling|high[- ]traffic)\b/i, theme: 'scalability' },
  { pattern: /\b(microservices?)\b/i, theme: 'microservices' },
  { pattern: /\b(cross[- ]functional|stakeholder)\b/i, theme: 'cross-functional collaboration' },
  { pattern: /\b(agile|scrum|kanban)\b/i, theme: 'agile delivery' },
  { pattern: /\b(ci\/cd|devops)\b/i, theme: 'DevOps practices' },
  { pattern: /\b(security|secure|compliance)\b/i, theme: 'security & compliance' },
  { pattern: /\b(data\s+pipeline|etl|analytics)\b/i, theme: 'data engineering' },
  { pattern: /\b(machine learning|ml|ai)\b/i, theme: 'AI/ML' },
];

function dedupeCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function findTermsInText(text: string, terms: readonly string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => {
    const needle = term.toLowerCase();
    return lower.includes(needle);
  });
}

function normalizeStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeCaseInsensitive(
    value.map((item) => String(item ?? '').trim()).filter(Boolean),
  ).slice(0, max);
}

export function extractJdRequirementsHeuristic(
  jobDescription: string,
): JdAlignmentRequirements {
  const text = jobDescription.trim();
  if (!text) {
    return {
      languages: [],
      requiredSkills: [],
      experienceThemes: [],
      experienceRequirements: [],
    };
  }

  const languages = findTermsInText(text, COMMON_LANGUAGES);
  const requiredSkills = findTermsInText(text, COMMON_SKILLS).filter(
    (skill) => !languages.some((lang) => lang.toLowerCase() === skill.toLowerCase()),
  );

  const experienceThemes = EXPERIENCE_THEME_PATTERNS.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ theme }) => theme);

  const experienceRequirements = dedupeCaseInsensitive(
    [
      ...(text.match(/\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?[\w\s/+-]{3,40}/gi) ?? []),
      ...EXPERIENCE_THEME_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
        ({ theme }) => theme,
      ),
    ].map((item) => item.trim()),
  ).slice(0, 8);

  return {
    languages: dedupeCaseInsensitive(languages).slice(0, 8),
    requiredSkills: dedupeCaseInsensitive(requiredSkills).slice(0, 16),
    experienceThemes: dedupeCaseInsensitive(experienceThemes).slice(0, 8),
    experienceRequirements,
  };
}

export function mergeJdAlignment(
  fromModel: Partial<JdAlignmentRequirements> | undefined,
  jobDescription: string,
): JdAlignmentRequirements {
  const heuristic = extractJdRequirementsHeuristic(jobDescription);

  return {
    languages: dedupeCaseInsensitive([
      ...normalizeStringArray(fromModel?.languages, 8),
      ...heuristic.languages,
    ]).slice(0, 15),
    requiredSkills: dedupeCaseInsensitive([
      ...normalizeStringArray(fromModel?.requiredSkills, 40),
      ...heuristic.requiredSkills,
    ]).slice(0, 40),
    experienceThemes: dedupeCaseInsensitive([
      ...normalizeStringArray(fromModel?.experienceThemes, 8),
      ...heuristic.experienceThemes,
    ]).slice(0, 10),
    experienceRequirements: dedupeCaseInsensitive([
      ...normalizeStringArray(fromModel?.experienceRequirements, 8),
      ...heuristic.experienceRequirements,
    ]).slice(0, 10),
  };
}

export function formatJdAlignmentForPrompt(
  alignment: JdAlignmentRequirements,
): string {
  const lines: string[] = [];

  if (alignment.languages.length > 0) {
    lines.push(`Languages: ${alignment.languages.join(', ')}`);
  }
  if (alignment.requiredSkills.length > 0) {
    lines.push(`Required skills: ${alignment.requiredSkills.join(', ')}`);
  }
  if (alignment.experienceThemes.length > 0) {
    lines.push(`Experience themes: ${alignment.experienceThemes.join(', ')}`);
  }
  if (alignment.experienceRequirements.length > 0) {
    lines.push(
      `Experience requirements: ${alignment.experienceRequirements.join('; ')}`,
    );
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'Languages: (none explicit)\nRequired skills: (infer from job description)\nExperience themes: (infer from job description)';
}

export function buildExperienceAlignmentUserBlock(options: {
  alignment: JdAlignmentRequirements;
  isMostRecent: boolean;
  jobDescriptionExcerpt?: string;
  assignedTechStackSkills?: string[];
}): string {
  const alignmentText = formatJdAlignmentForPrompt(options.alignment);
  const assignedSkills = normalizeTechStackSkills(
    options.assignedTechStackSkills ??
      dedupeCaseInsensitive([
        ...options.alignment.languages,
        ...options.alignment.requiredSkills,
      ]),
  );

  if (options.isMostRecent) {
    const excerpt = options.jobDescriptionExcerpt?.trim() ?? '';
    const jdSkillLine =
      assignedSkills.length > 0
        ? `ALL JD tech-stack skills (mandatory in skills array): ${assignedSkills.join(', ')}`
        : '';
    return [
      'TARGET ROLE ALIGNMENT (MOST RECENT ROLE — mandatory)',
      'Achievements and skills MUST reflect these JD requirements wherever supported by the role context.',
      '- The skills array MUST include every JD tech-stack skill listed below (platform names only: AWS not EC2/RDS).',
      '- skills must be concrete tech stacks only — no compliance, design practices, or soft skills.',
      '- At least 4 achievement bullets must explicitly name technologies from the lists below.',
      '- Weave experience themes into achievement scope/outcomes without naming the employer.',
      '- Do not put the company name in achievement bullets. Include credible numeric improvements in exactly 1–2 bullets; no metrics in the rest.',
      jdSkillLine,
      alignmentText,
      excerpt ? `Job description excerpt:\n${excerpt}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const partialSkillLine =
    assignedSkills.length > 0
      ? `Include a credible subset of these JD tech-stack skills when supported by this company: ${assignedSkills.join(', ')}`
      : '';

  return [
    'TARGET ROLE ALIGNMENT (older role — apply only where supported by this company context)',
    'skills must be concrete tech stacks only — no compliance, design practices, or soft skills.',
    'Mirror JD languages/skills/themes only when credible for this specific company, product, and mission.',
    partialSkillLine,
    alignmentText,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Compact JD context for summary/skills steps (alignment + optional short excerpt). */
export function buildCompactJdContextForPrompt(
  alignment: JdAlignmentRequirements,
  jobDescriptionExcerpt?: string,
): string {
  const alignmentText = formatJdAlignmentForPrompt(alignment);
  const excerpt = jobDescriptionExcerpt?.trim() ?? '';

  if (!excerpt) {
    return `Job requirements (extracted):\n${alignmentText}`;
  }

  return [
    'Job requirements (extracted):',
    alignmentText,
    `Job description excerpt:\n${excerpt}`,
  ].join('\n\n');
}
