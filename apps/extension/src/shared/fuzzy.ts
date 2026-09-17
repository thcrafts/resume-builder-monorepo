export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tokenOverlap(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return Math.max(0.72, shorter / longer);
  }
  const ta = new Set(na.split(' ').filter((t) => t.length > 1));
  const tb = new Set(nb.split(' ').filter((t) => t.length > 1));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const token of ta) {
    if (tb.has(token)) inter += 1;
  }
  return inter / Math.max(ta.size, tb.size);
}

export function bestMatch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold = 0.55,
): T | null {
  let best: T | null = null;
  let score = threshold;
  for (const item of items) {
    const next = tokenOverlap(query, getText(item));
    if (next > score) {
      score = next;
      best = item;
    }
  }
  return best;
}

export function pickResumeByPage(
  resumes: Array<{ companyName: string; roleType: string }>,
  companyGuess: string,
  roleGuess: string,
): number {
  let bestIndex = 0;
  let best = -1;
  resumes.forEach((resume, index) => {
    const company = tokenOverlap(companyGuess, resume.companyName);
    const role = tokenOverlap(roleGuess, resume.roleType);
    const score = company * 0.7 + role * 0.3;
    if (score > best) {
      best = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
