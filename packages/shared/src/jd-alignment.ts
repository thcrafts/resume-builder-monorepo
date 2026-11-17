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
  const languages = normalizeStringArray(fromModel?.languages, 15);
  const requiredSkills = normalizeStringArray(fromModel?.requiredSkills, 40);
  const modelEmpty = languages.length === 0 && requiredSkills.length === 0;

  return {
    languages: modelEmpty ? heuristic.languages : languages,
    requiredSkills: modelEmpty ? heuristic.requiredSkills : requiredSkills,
    experienceThemes: (() => {
      const fromModelThemes = normalizeStringArray(fromModel?.experienceThemes, 10);
      return fromModelThemes.length > 0 ? fromModelThemes : heuristic.experienceThemes;
    })(),
    experienceRequirements: (() => {
      const fromModelReqs = normalizeStringArray(
        fromModel?.experienceRequirements,
        10,
      );
      return fromModelReqs.length > 0
        ? fromModelReqs
        : heuristic.experienceRequirements;
    })(),
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

/** Mandatory JD experience themes + requirements used to customize writing. */
export function collectMandatoryJdExperience(
  alignment: JdAlignmentRequirements,
): string[] {
  return dedupeCaseInsensitive([
    ...alignment.experienceRequirements,
    ...alignment.experienceThemes,
  ]);
}

export function buildExperienceAlignmentUserBlock(options: {
  alignment: JdAlignmentRequirements;
  isMostRecent: boolean;
  recencyRank?: number;
  assignedJdSkills?: string[];
  keyModernSkills?: string[];
  jobDescriptionExcerpt?: string;
  /** When false, do not weave JD skills/experience into this company role. */
  jdEligible?: boolean;
  company?: {
    title: string;
    product: string;
    mission: string;
    job_type?: string;
    context?: string;
  };
}): string {
  const jdEligible = options.jdEligible !== false;
  const recencyRank = options.recencyRank ?? (options.isMostRecent ? 0 : 1);
  const isMostRecent = options.isMostRecent || recencyRank === 0;
  const assignedJdSkills = !jdEligible
    ? []
    : dedupeCaseInsensitive(
        options.assignedJdSkills && options.assignedJdSkills.length > 0
          ? options.assignedJdSkills
          : isMostRecent
            ? [
                ...options.alignment.languages,
                ...options.alignment.requiredSkills,
              ]
            : [
                ...options.alignment.languages,
                ...options.alignment.requiredSkills,
              ].slice(0, 6),
      );
  const keyModernSkills = dedupeCaseInsensitive(options.keyModernSkills ?? []);
  const mandatoryExperience = collectMandatoryJdExperience(options.alignment);
  const alignmentText = formatJdAlignmentForPrompt(options.alignment);
  const strength =
    recencyRank <= 0
      ? 'STRONGEST (most recent role)'
      : recencyRank === 1
        ? 'STRONG (previous role)'
        : recencyRank === 2
          ? 'MODERATE (older role)'
          : 'LIGHT (earliest role)';

  const company = options.company;
  const companyLines = company
    ? [
        `Official job title (do not change): ${company.title}`,
        `Product: ${company.product}`,
        `Mission: ${company.mission}`,
        company.job_type ? `Role type: ${company.job_type}` : '',
        company.context ? `Extra company context: ${company.context}` : '',
      ].filter(Boolean)
    : [];

  if (!jdEligible) {
    const keyModernLine =
      keyModernSkills.length > 0
        ? `Candidate modern skillsets for THIS title (keep natural to the official job title): ${keyModernSkills.join(', ')}`
        : 'Candidate modern skillsets: keep technologies natural to this official job title.';

    return [
      'TARGET ROLE ALIGNMENT — TITLE MISMATCH (skip JD weave)',
      'Write achievement bullets for THIS employer only. Keep the official job title, employer, dates, and location unchanged.',
      "This company's official title is NOT similar to the target JD role. Do NOT add mandatory JD skills or mandatory JD experience into these bullets.",
      "Keep this company's main product, mission, and extra context as the bullet content for the official job title.",
      'Do not rewrite this role around the JD. Do not invent JD-shaped projects or tech stacks.',
      '- Prefer one primary accomplishment per bullet.',
      '- Never put the employer name in bullets. Include numeric improvements in exactly 1–2 bullets using the Metric targets for this role; no metrics in the rest.',
      keyModernLine,
      'Mandatory JD skills to ADD: none (title dissimilar to JD).',
      ...companyLines,
      alignmentText
        ? `JD context (for awareness only — do not weave into this role):\n${alignmentText}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  const assignedLine =
    assignedJdSkills.length > 0
      ? `Mandatory JD skills to ADD (not replace) in THIS role's main-product bullets (recency ${strength}): ${assignedJdSkills.join(', ')}`
      : 'Mandatory JD skills to ADD: (infer must-have technologies from the job description)';
  const keyModernLine =
    keyModernSkills.length > 0
      ? `Candidate modern skillsets (ADD alongside JD items; do not drop them for a JD-only rewrite): ${keyModernSkills.join(', ')}`
      : 'Candidate modern skillsets: keep recent languages and frameworks from the candidate skill set in the product story.';
  const experienceLine =
    isMostRecent && mandatoryExperience.length > 0
      ? `Mandatory JD experience to INCLUDE in this most-recent role (reflect realistically in product bullets, with modern skillsets): ${mandatoryExperience.join('; ')}`
      : '';

  const excerpt = options.jobDescriptionExcerpt?.trim() ?? '';

  return [
    `TARGET ROLE ALIGNMENT — ${strength}`,
    'Write achievement bullets for THIS employer only. Keep the official job title, employer, dates, and location unchanged.',
    'Do not replace this role with the JD job name (e.g. do not retitle Senior Software Engineer as Low Code Application Developer).',
    "Keep this company's main product, mission, and extra context as the bullet content. Customize wording toward the JD. Do not replace that work with JD skills.",
    'Keep recent modern frameworks, languages, and key technologies from the candidate skill set in those product bullets.',
    'ADD the assigned mandatory skill names into that existing product work with modern skillsets. No gap-fill, no implied stacks, no weak evidence (no "familiar with", "exposed to", "knowledge of").',
    isMostRecent
      ? 'Most recent role: INCLUDE the mandatory JD skills and the mandatory JD experience. ADD them realistically onto this company\'s main product together with modern skillsets (built, implemented, owned, shipped). Spread across bullets; do not turn the section into a JD checklist.'
      : "Older role: weaker match than more recent roles. Keep this company's real work and its modern/key stack. ADD only the assigned (smaller) mandatory subset. Do not invent JD-shaped projects.",
    '- Prefer one primary accomplishment per bullet; name a modern/key or added mandatory skill only where it belongs in that work.',
    '- Never put the employer name in bullets. Include numeric improvements in exactly 1–2 bullets using the Metric targets for this role; no metrics in the rest.',
    keyModernLine,
    assignedLine,
    experienceLine,
    ...companyLines,
    alignmentText,
    excerpt && isMostRecent ? `Job description excerpt:\n${excerpt}` : '',
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
