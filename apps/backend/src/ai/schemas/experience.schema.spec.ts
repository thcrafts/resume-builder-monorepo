import { coerceToPlainText, parseExperienceResult } from './experience.schema';

describe('parseExperienceResult', () => {
  it('accepts achievements bullets', () => {
    const result = parseExperienceResult({
      achievements: ['Built APIs serving 1M users.'],
      skills: ['Node.js', 'PostgreSQL'],
    });

    expect(result.achievements).toEqual(['Built APIs serving 1M users.']);
    expect(result.skills).toEqual(['Node.js', 'PostgreSQL']);
  });

  it('falls back to responsibilities when achievements are missing', () => {
    const result = parseExperienceResult({
      responsibilities: ['Led migration reducing latency by 30%.'],
      skills: ['AWS'],
    });

    expect(result.achievements).toEqual([
      'Led migration reducing latency by 30%.',
    ]);
  });

  it('rejects empty achievement bullets after trimming', () => {
    expect(() =>
      parseExperienceResult({
        achievements: ['   '],
        skills: ['React'],
      }),
    ).toThrow('Invalid experience achievements response');
  });

  it('coerces object-shaped achievements into plain text', () => {
    const result = parseExperienceResult({
      achievements: [
        { text: 'Built APIs serving 1M users for the platform.' },
        { bullet: 'Cut latency by 40% across checkout.' },
        { description: 'Grew adoption by 25% for the product.' },
      ],
      skills: [{ name: 'Node.js' }, 'PostgreSQL'],
    });

    expect(result.achievements).toEqual([
      'Built APIs serving 1M users for the platform.',
      'Cut latency by 40% across checkout.',
      'Grew adoption by 25% for the product.',
    ]);
    expect(result.skills).toEqual(['Node.js', 'PostgreSQL']);
  });
});

describe('coerceToPlainText', () => {
  it('returns empty string for bare objects without text fields', () => {
    expect(coerceToPlainText({})).toBe('');
    expect(coerceToPlainText({ count: 3 })).toBe('');
  });
});
