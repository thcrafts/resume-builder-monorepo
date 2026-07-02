import {
  MAX_WORDS_PER_EXPERIENCE_BULLET,
  normalizeExperienceBullet,
  normalizeResumeExperienceBullets,
} from './normalize-resume-json';

describe('normalizeExperienceBullet', () => {
  it('strips leading list markers and limits words', () => {
    const input =
      '- Led cross functional teams to deliver scalable Node.js APIs for enterprise clients worldwide';
    const result = normalizeExperienceBullet(input);

    expect(result.startsWith('-')).toBe(false);
    expect(result.split(' ').length).toBeLessThanOrEqual(
      MAX_WORDS_PER_EXPERIENCE_BULLET,
    );
  });

  it('removes spaced hyphen separators', () => {
    expect(normalizeExperienceBullet('Built APIs - improved latency by 30%')).toBe(
      'Built APIs, improved latency by 30%',
    );
  });
});

describe('normalizeResumeExperienceBullets', () => {
  it('trims combined responsibilities and achievements to five bullets', () => {
    const resume = normalizeResumeExperienceBullets({
      skills: [],
      experience: [
        {
          responsibilities: ['One', 'Two', 'Three'],
          achievements: ['Four', 'Five', 'Six', 'Seven', 'Eight'],
        },
      ],
    });

    const role = resume.experience?.[0];
    expect(role?.responsibilities).toEqual(['One', 'Two', 'Three']);
    expect(role?.achievements).toEqual(['Four', 'Five']);
    expect(
      (role?.responsibilities?.length ?? 0) + (role?.achievements?.length ?? 0),
    ).toBe(5);
  });
});
