import {
  MAX_WORDS_PER_EXPERIENCE_BULLET,
  ensureSentenceEnding,
  normalizeExperienceBullet,
  normalizeResumeExperienceBullets,
} from './normalize-resume-json';

describe('normalizeExperienceBullet', () => {
  it('strips leading list markers and allows up to 28 words', () => {
    const input =
      '- Led cross functional teams to deliver scalable Node.js APIs for enterprise clients worldwide today';
    const result = normalizeExperienceBullet(input);

    expect(result.startsWith('-')).toBe(false);
    expect(result.split(' ').length).toBeLessThanOrEqual(
      MAX_WORDS_PER_EXPERIENCE_BULLET,
    );
    expect(result.endsWith('.')).toBe(true);
  });

  it('removes spaced hyphen separators and adds a period', () => {
    expect(normalizeExperienceBullet('Built APIs - improved latency by 30%')).toBe(
      'Built APIs, improved latency by 30%.',
    );
  });

  it('does not cut a 18 word sentence mid phrase', () => {
    const input =
      'Architected and delivered a full-stack platform using React, Redux, Node.js, and MongoDB from inception to production launch.';
    const result = normalizeExperienceBullet(input);

    expect(result.endsWith('.')).toBe(true);
    expect(result).toContain('production launch.');
    expect(result.split(' ').length).toBeLessThanOrEqual(
      MAX_WORDS_PER_EXPERIENCE_BULLET,
    );
  });
});

describe('ensureSentenceEnding', () => {
  it('appends a period when missing', () => {
    expect(ensureSentenceEnding('Delivered scalable APIs')).toBe(
      'Delivered scalable APIs.',
    );
  });
});

describe('normalizeResumeExperienceBullets', () => {
  it('trims combined responsibilities and achievements to six bullets', () => {
    const resume = normalizeResumeExperienceBullets({
      skills: [],
      experience: [
        {
          responsibilities: ['One.', 'Two.', 'Three.'],
          achievements: ['Four.', 'Five.', 'Six.', 'Seven.', 'Eight.'],
        },
      ],
    });

    const role = resume.experience?.[0];
    expect(role?.responsibilities).toEqual(['One.', 'Two.', 'Three.']);
    expect(role?.achievements).toEqual(['Four.', 'Five.', 'Six.']);
    expect(
      (role?.responsibilities?.length ?? 0) + (role?.achievements?.length ?? 0),
    ).toBe(6);
  });
});
