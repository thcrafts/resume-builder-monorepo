import { coerceToPlainText, parseExperienceResult } from './experience.schema';

describe('parseExperienceResult', () => {
  it('accepts achievements bullets', () => {
    const result = parseExperienceResult({
      achievements: ['Built APIs serving 1M users across the platform.'],
      skills: ['Node.js', 'PostgreSQL'],
    });

    expect(result.achievements).toEqual([
      'Built APIs serving 1M users across the platform.',
    ]);
    expect(result.skills).toEqual(['Node.js', 'PostgreSQL']);
  });

  it('falls back to responsibilities when achievements are missing', () => {
    const result = parseExperienceResult({
      responsibilities: ['Led migration reducing latency by 30% for checkout.'],
      skills: ['AWS'],
    });

    expect(result.achievements).toEqual([
      'Led migration reducing latency by 30% for checkout.',
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

  it('drops boolean leftovers that would render as False.', () => {
    const result = parseExperienceResult({
      achievements: [
        'Built APIs serving 1M users for the platform.',
        false,
        true,
        'False',
        'Grew adoption by 25% for the product with AI tools.',
        'Scaled search index supporting two million daily users.',
        'Automated release pipelines reducing deploy time by 40%.',
      ],
      skills: ['Node.js', false, 'PostgreSQL'],
    });

    expect(result.achievements).toEqual([
      'Built APIs serving 1M users for the platform.',
      'Grew adoption by 25% for the product with AI tools.',
      'Scaled search index supporting two million daily users.',
      'Automated release pipelines reducing deploy time by 40%.',
    ]);
    expect(result.skills).toEqual(['Node.js', 'PostgreSQL']);
  });

  it('coerces object-shaped achievements into plain text', () => {
    const result = parseExperienceResult({
      achievements: [
        { text: 'Built APIs serving 1M users for the platform.' },
        { bullet: 'Cut latency by 40% across checkout flows today.' },
        { description: 'Grew adoption by 25% for the product line.' },
      ],
      skills: [{ name: 'Node.js' }, 'PostgreSQL'],
    });

    expect(result.achievements).toEqual([
      'Built APIs serving 1M users for the platform.',
      'Cut latency by 40% across checkout flows today.',
      'Grew adoption by 25% for the product line.',
    ]);
    expect(result.skills).toEqual(['Node.js', 'PostgreSQL']);
  });
});

describe('coerceToPlainText', () => {
  it('returns empty string for bare objects without text fields', () => {
    expect(coerceToPlainText({})).toBe('');
    expect(coerceToPlainText({ count: 3 })).toBe('');
  });

  it('returns empty string for booleans instead of "false"/"true"', () => {
    expect(coerceToPlainText(false)).toBe('');
    expect(coerceToPlainText(true)).toBe('');
  });
});
