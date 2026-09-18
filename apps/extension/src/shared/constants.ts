export const EEO_PATTERN =
  /\b(gender|sex\b|hispanic|latino|latina|race|ethnicity|veteran|disability|disabled|lgbt|sexual orientation|pronoun|demographic|equal employment|eeo|eeoc|decline to self[- ]identif|protected veteran|voluntary self)\b/i;

export const CAPTCHA_PATTERN =
  /\b(captcha|recaptcha|hcaptcha|turnstile|i am not a robot|human check)\b/i;

export const SKIP_LEGAL_PATTERN =
  /\b(terms of (use|service)|privacy policy|candidate privacy|i agree to|i have read and|i consent to the (privacy|terms))\b/i;

export const SALARY_PATTERN =
  /\b(salary|compensation|desired pay|expected pay|pay expectation|wage)\b/i;

export const SSN_PATTERN =
  /\b(ssn|social security|national insurance|passport number|driver'?s license)\b/i;

export const SUBMIT_TEXT =
  /^(submit( application| my application)?|apply( now)?|send application|finish application)$/i;

export const NEXT_TEXT =
  /^(next( step)?|continue|save and continue|save & continue)$/i;
