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
}): string {
  const alignmentText = formatJdAlignmentForPrompt(options.alignment);
  const priorityLanguages = dedupeCaseInsensitive(options.alignment.languages);
  const prioritySkills = dedupeCaseInsensitive(options.alignment.requiredSkills);
  const priorityTech = dedupeCaseInsensitive([
    ...priorityLanguages,
    ...prioritySkills,
  ]);

  if (options.isMostRecent) {
    const excerpt = options.jobDescriptionExcerpt?.trim() ?? '';
    const languageLine =
      priorityLanguages.length > 0
        ? `JD languages that MUST appear by name in at least 1–2 achievement bullets: ${priorityLanguages.join(', ')}`
        : '';
    const techLine =
      priorityTech.length > 0
        ? `Priority JD technologies to weave across bullets (name them explicitly where credible): ${priorityTech.join(', ')}`
        : '';
    return [
      'TARGET ROLE ALIGNMENT (MOST RECENT ROLE)',
      'Achievement bullets must demonstrate JD-relevant technical experience so Core Technologies and company experience stay aligned.',
      '- Name specific JD technologies in bullets — do not leave key JD languages (e.g. Rust, Go, TypeScript) only in Core Technologies.',
      '- Every JD language listed below MUST appear by name in at least one achievement bullet.',
      '- Cover a credible mix of JD frameworks/tools across the bullets (not every skill in every bullet).',
      '- Keep bullets credible for this company/product/mission; do not invent unrelated product work.',
      '- Weave experience themes into achievement scope/outcomes without naming the employer.',
      '- Do not put the company name in achievement bullets. Include credible numeric improvements in exactly 1–2 bullets; no metrics in the rest.',
      languageLine,
      techLine,
      alignmentText,
      excerpt ? `Job description excerpt:\n${excerpt}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const olderTechLine =
    priorityTech.length > 0
      ? `Optional JD technologies to mention only when credible for this company/period: ${priorityTech.slice(0, 6).join(', ')}`
      : '';

  return [
    'TARGET ROLE ALIGNMENT (older role — apply only where supported by this company context)',
    'Mirror JD languages/skills/themes only when credible for this specific company, product, and mission.',
    olderTechLine,
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
