import {
  CAPTCHA_PATTERN,
  EEO_PATTERN,
  SALARY_PATTERN,
  SKIP_LEGAL_PATTERN,
  SSN_PATTERN,
} from '../shared/constants';

export function shouldLeaveField(label: string, name = ''): boolean {
  const text = `${label} ${name}`;
  return (
    EEO_PATTERN.test(text) ||
    CAPTCHA_PATTERN.test(text) ||
    SALARY_PATTERN.test(text) ||
    SSN_PATTERN.test(text) ||
    SKIP_LEGAL_PATTERN.test(text)
  );
}
