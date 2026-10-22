import { normalizeQuestionsText } from './normalize-questions-text';

describe('normalizeQuestionsText', () => {
  it('numbers newline-separated questions that do not end with ?', () => {
    expect(
      normalizeQuestionsText(
        'Why do you want this role\nWhat is your notice period\nAre you authorized to work in the US',
      ),
    ).toBe(
      [
        '1. Why do you want this role',
        '2. What is your notice period',
        '3. Are you authorized to work in the US',
      ].join('\n'),
    );
  });

  it('keeps existing numbering', () => {
    expect(
      normalizeQuestionsText('1) First question?\n2) Second question'),
    ).toBe('1) First question?\n2) Second question');
  });

  it('does not invent numbering for a single blob', () => {
    expect(normalizeQuestionsText('  Why this role?  ')).toBe('Why this role?');
  });

  it('drops blank lines between questions', () => {
    expect(
      normalizeQuestionsText('Question one\n\n\nQuestion two'),
    ).toBe('1. Question one\n2. Question two');
  });
});
