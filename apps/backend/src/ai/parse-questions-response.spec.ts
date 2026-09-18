import { parseQuestionsResponse } from './parse-questions-response';

describe('parseQuestionsResponse', () => {
  it('parses a clean JSON payload', () => {
    const result = parseQuestionsResponse(
      JSON.stringify({
        questions_and_answers: [
          { question: 'Why this role?', answer: 'I have shipped platform work at this scale, and I want to keep doing that here.' },
        ],
      }),
    );

    expect(result).toEqual([
      {
        question: 'Why this role?',
        answer: 'I have shipped platform work at this scale, and I want to keep doing that here.',
      },
    ]);
  });

  it('extracts JSON from prose and markdown fences', () => {
    const result = parseQuestionsResponse(`Here is a professional application reply email:

\`\`\`json
{"questions_and_answers":[{"question":"Are you authorized to work?","answer":"Yes, I am authorized to work in the United States."}]}
\`\`\`
`);

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe('Are you authorized to work?');
  });

  it('extracts a JSON object buried in surrounding text', () => {
    const result = parseQuestionsResponse(
      'Here is a professional application reply email:\n\n{"questions_and_answers":[{"question":"Q","answer":"A"}]}\nThanks',
    );

    expect(result).toEqual([{ question: 'Q', answer: 'A' }]);
  });

  it('throws a short error when no JSON is present', () => {
    expect(() =>
      parseQuestionsResponse('Here is a professional application reply email:'),
    ).toThrow(/Failed to parse JSON from AI response/);
  });
});
