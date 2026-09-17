import type { SemanticKey } from '../shared/types';
import { normalizeText, tokenOverlap } from '../shared/fuzzy';

const PATTERNS: Array<[SemanticKey, RegExp[]]> = [
  ['first_name', [/^first name$/, /\bgiven name\b/, /^first$/]],
  ['last_name', [/^last name$/, /\bfamily name\b/, /\bsurname\b/, /^last$/]],
  ['full_name', [/^(full )?legal name$/, /^full name$/, /^name$/]],
  ['email', [/e-?mail/]],
  ['phone', [/\b(phone|mobile|cell|telephone)\b/]],
  ['linkedin', [/linkedin/]],
  ['github', [/github/]],
  ['website', [/\b(website|portfolio|personal site)\b/]],
  ['headline', [/\bheadline\b/, /professional title/]],
  ['current_company', [/current company/, /current employer/, /^company$/]],
  ['address', [/\b(street )?address\b/, /location/, /city,? state/]],
  ['city', [/^city$/]],
  ['state', [/^state$/, /province/]],
  ['zip', [/zip/, /postal/]],
  ['country', [/^country$/]],
  ['resume', [/\b(resume|cv)\b/]],
  ['cover_letter', [/cover letter/]],
  ['cover_letter_text', [/cover letter/]],
  ['additional_info', [/additional (info|information|comments)/, /^comments$/]],
  ['work_auth', [/authorized to work/, /work authorization/, /legally (eligible|authorized)/, /visa/]],
  ['relocate', [/relocat/, /willing to move/]],
  ['start_date', [/available to start/, /start date/, /notice period/]],
  ['sms_consent', [/text message/, /\bsms\b/, /recruiting related text/]],
  ['heard_about', [/hear about/, /how did you find/, /source/]],
  ['worked_before', [/worked (with|for) us before/, /previously employed/, /former employee/]],
  ['years_experience', [/years of experience/, /years'? experience/]],
];

const AUTOCOMPLETE: Record<string, SemanticKey> = {
  'given-name': 'first_name',
  'family-name': 'last_name',
  name: 'full_name',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  'street-address': 'address',
  'address-line1': 'address',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'zip',
  'country-name': 'country',
  url: 'website',
};

export function inferSemantic(
  label: string,
  name: string,
  autocomplete: string,
  type: string,
): SemanticKey | null {
  const ac = AUTOCOMPLETE[autocomplete.trim().toLowerCase()];
  if (ac) return ac;
  if (type === 'email') return 'email';
  if (type === 'tel') return 'phone';
  if (type === 'url' && /linkedin/i.test(`${label} ${name}`)) return 'linkedin';
  if (type === 'file' && /cover/i.test(`${label} ${name}`)) return 'cover_letter';
  if (type === 'file' && /resume|cv/i.test(`${label} ${name}`)) return 'resume';
  if (type === 'file') return 'resume';

  const hay = normalizeText(`${label} ${name}`);
  for (const [key, regs] of PATTERNS) {
    if (regs.some((re) => re.test(hay))) return key;
  }
  return null;
}

export function matchSelectOption(options: string[], desired: string): string | null {
  let best: string | null = null;
  let score = 0.45;
  for (const option of options) {
    const next = tokenOverlap(desired, option);
    if (next > score) {
      score = next;
      best = option;
    }
  }
  return best;
}
