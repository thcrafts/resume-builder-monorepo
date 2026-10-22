/**
 * Keep line breaks so paste-one-question-per-line still works when lines
 * do not end with "?". Collapse spaces within each line only.
 */
export function normalizeQuestionsText(text: string): string {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return '';
  }

  const alreadyNumbered = lines.every((line) => /^\d+[.)]\s+/.test(line));
  if (alreadyNumbered || lines.length === 1) {
    return lines.join('\n');
  }

  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}
