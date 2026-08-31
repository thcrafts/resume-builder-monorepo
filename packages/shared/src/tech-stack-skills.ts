/** Non-tech phrases that should not appear in company role skill lists. */
const NON_TECH_SKILL_PATTERNS: RegExp[] = [
  /\bhipaa\b/i,
  /\bcompliance\b/i,
  /\bsoc\s*2\b/i,
  /\bpci\b/i,
  /\bgdpr\b/i,
  /\bsox\b/i,
  /\bregulatory\b/i,
  /\bregulation\b/i,
  /\baudit(ing)?\b/i,
  /\bdatabase design\b/i,
  /\brelational database design\b/i,
  /\bquery optimization\b/i,
  /\bperformance optimization\b/i,
  /\bsystem design\b/i,
  /\bsoftware design\b/i,
  /\btechnical leadership\b/i,
  /\bteam leadership\b/i,
  /\bcommunication\b/i,
  /\bcollaboration\b/i,
  /\bstakeholder\b/i,
  /\bproblem solving\b/i,
  /\bbest practices\b/i,
  /\barchitecture\b/i,
  /\bscalability\b/i,
  /\bmicroservices architecture\b/i,
  /\bagile\b/i,
  /\bscrum\b/i,
  /\bkanban\b/i,
  /\bmentoring\b/i,
  /\bcode review\b/i,
  /\boptimization\b/i,
  /\bdesign patterns?\b/i,
];

const AWS_SERVICE_TERMS = [
  'ec2',
  'rds',
  's3',
  'lambda',
  'ecs',
  'eks',
  'sqs',
  'sns',
  'cloudwatch',
  'cloudfront',
  'iam',
  'route 53',
  'route53',
  'api gateway',
  'elasticache',
  'redshift',
  'fargate',
  'elb',
  'alb',
  'nlb',
  'dynamodb',
  'aurora',
  'vpc',
  'cloudformation',
  'step functions',
  'eventbridge',
  'kinesis',
  'glue',
  'athena',
  'emr',
  'sagemaker',
];

const AZURE_SERVICE_TERMS = [
  'azure vm',
  'azure sql',
  'azure functions',
  'blob storage',
  'cosmos db',
  'app service',
  'aks',
  'azure kubernetes',
  'service bus',
  'event hubs',
  'key vault',
  'azure devops',
];

const GCP_SERVICE_TERMS = [
  'gke',
  'bigquery',
  'cloud run',
  'compute engine',
  'cloud storage',
  'cloud functions',
  'pub/sub',
  'pubsub',
  'cloud sql',
  'firebase',
  'dataflow',
];

function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
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

export function isNonTechStackSkill(skill: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) {
    return true;
  }

  return NON_TECH_SKILL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function matchesAnyTerm(skill: string, terms: string[]): boolean {
  const lower = skill.trim().toLowerCase();
  return terms.some((term) => {
    if (lower === term) {
      return true;
    }
    if (term.includes(' ')) {
      return lower.includes(term);
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });
}

export function isAwsFamilySkill(skill: string): boolean {
  const lower = skill.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower === 'aws' || lower.includes('amazon web services')) {
    return true;
  }
  if (lower.startsWith('aws ') || lower.includes(' aws')) {
    return true;
  }
  return matchesAnyTerm(lower, AWS_SERVICE_TERMS);
}

export function isAzureFamilySkill(skill: string): boolean {
  const lower = skill.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower === 'azure' || lower.includes('microsoft azure')) {
    return true;
  }
  if (lower.startsWith('azure ') || lower.includes(' azure')) {
    return true;
  }
  return matchesAnyTerm(lower, AZURE_SERVICE_TERMS);
}

export function isGcpFamilySkill(skill: string): boolean {
  const lower = skill.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower === 'gcp' || lower.includes('google cloud')) {
    return true;
  }
  if (lower.startsWith('gcp ') || lower.includes(' gcp')) {
    return true;
  }
  return matchesAnyTerm(lower, GCP_SERVICE_TERMS);
}

/** True when two skills refer to the same cloud family (e.g. EC2 vs AWS). */
export function techStackSkillsMatch(skill: string, candidate: string): boolean {
  const a = skill.trim().toLowerCase();
  const b = candidate.trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  if (a === b || a.includes(b) || b.includes(a)) {
    return true;
  }
  if (isAwsFamilySkill(skill) && isAwsFamilySkill(candidate)) {
    return true;
  }
  if (isAzureFamilySkill(skill) && isAzureFamilySkill(candidate)) {
    return true;
  }
  if (isGcpFamilySkill(skill) && isGcpFamilySkill(candidate)) {
    return true;
  }
  return false;
}

/**
 * Keep only concrete tech-stack names; collapse AWS/Azure/GCP services to the platform.
 */
export function normalizeTechStackSkills(skills: string[]): string[] {
  let hasAws = false;
  let hasAzure = false;
  let hasGcp = false;
  const result: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed || isNonTechStackSkill(trimmed)) {
      continue;
    }

    if (isAwsFamilySkill(trimmed)) {
      hasAws = true;
      continue;
    }
    if (isAzureFamilySkill(trimmed)) {
      hasAzure = true;
      continue;
    }
    if (isGcpFamilySkill(trimmed)) {
      hasGcp = true;
      continue;
    }

    result.push(trimmed);
  }

  if (hasAws) {
    result.push('AWS');
  }
  if (hasAzure) {
    result.push('Azure');
  }
  if (hasGcp) {
    result.push('GCP');
  }

  return dedupeSkills(result);
}

import type { JdAlignmentRequirements } from './jd-alignment';

/** Strip non-tech items from JD alignment before they reach company experience skills. */
export function sanitizeJdAlignmentTechStacks(
  alignment: JdAlignmentRequirements,
): JdAlignmentRequirements {
  return {
    ...alignment,
    languages: normalizeTechStackSkills(alignment.languages),
    requiredSkills: normalizeTechStackSkills(alignment.requiredSkills),
    // experienceThemes / experienceRequirements stay for achievement bullets only
  };
}
