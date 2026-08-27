import { extractJsonText } from './extract-json-text';

export function parseQuestionsResponse(
  outputText: string,
): Array<{ question: string; answer: string }> {
  const jsonText = extractJsonText(outputText);

  try {
    const parsed = JSON.parse(jsonText) as {
      questions_and_answers?: unknown;
    };
    const pairs = parsed.questions_and_answers;
    if (Array.isArray(pairs)) {
      return pairs
        .filter(
          (qa) =>
            qa &&
            typeof qa.question === 'string' &&
            typeof qa.answer === 'string',
        )
        .map((qa) => ({
          question: qa.question.trim(),
          answer: qa.answer.trim(),
        }))
        .filter((qa) => qa.question.length > 0 && qa.answer.length > 0);
    }
    throw new Error('Invalid response format: expected questions_and_answers array');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON from AI response: ${reason}`,
    );
  }
}
