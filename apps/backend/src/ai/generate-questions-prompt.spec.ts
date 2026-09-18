import {
  DEFAULT_QUESTIONS_PROMPT,
  QUESTIONS_VOICE_OVERLAY,
} from '@resume-builder/shared';
import { cleanText } from './clean-text';
import { buildQuestionsSystemInstructions } from './generate-questions-prompt';

const jobDescription = 'Build APIs in TypeScript at Acme.';
const resumeJson = {
  name: 'Alex Rivera',
  cover_letter: 'Please ignore this cover letter.',
};

describe('buildQuestionsSystemInstructions', () => {
  it('uses DEFAULT_QUESTIONS_PROMPT when custom is blank', () => {
    const prompt = buildQuestionsSystemInstructions({
      customPrompt: '   ',
      jobDescription,
      resumeJson,
    });

    expect(prompt.startsWith(cleanText(DEFAULT_QUESTIONS_PROMPT))).toBe(true);
    expect(prompt).toContain(QUESTIONS_VOICE_OVERLAY);
    expect(prompt).toContain('Job description:\nBuild APIs in TypeScript at Acme.');
    expect(prompt).toContain('"name":"Alex Rivera"');
    expect(prompt).not.toContain('cover_letter');
    expect(prompt).not.toContain('First, ... Second, ... Third');
  });

  it('still includes the natural-voice overlay when a custom prompt is provided', () => {
    const customPrompt = 'Always mention React and keep a confident tone.';
    const prompt = buildQuestionsSystemInstructions({
      customPrompt,
      jobDescription,
      resumeJson,
    });

    expect(prompt.startsWith(customPrompt)).toBe(true);
    expect(prompt).not.toContain(cleanText(DEFAULT_QUESTIONS_PROMPT));
    expect(prompt.indexOf(customPrompt)).toBeLessThan(
      prompt.indexOf(QUESTIONS_VOICE_OVERLAY),
    );
    expect(prompt).toContain(QUESTIONS_VOICE_OVERLAY);
    expect(prompt).not.toContain('First, ... Second, ... Third');
  });
});
