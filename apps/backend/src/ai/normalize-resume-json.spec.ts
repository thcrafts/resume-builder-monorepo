import {
  MAX_WORDS_PER_EXPERIENCE_BULLET,
  ensureSentenceEnding,
  normalizeExperienceBullet,
  normalizeResumeExperienceBullets,
} from './normalize-resume-json';

describe('normalizeExperienceBullet', () => {
  it('strips leading list markers and allows up to the word limit', () => {
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
  it('merges responsibilities into achievements and caps at six bullets', () => {
    const resume = normalizeResumeExperienceBullets({
      skills: [],
      experience: [
        {
          responsibilities: [
            'Owned API gateway delivery for the platform rollout.',
            'Led migration of billing services cutting latency 30%.',
            'Built observability dashboards for production incidents.',
          ],
          achievements: [
            'Shipped checkout rewrite improving conversion by 12%.',
            'Scaled search index supporting two million daily users.',
            'Automated release pipelines reducing deploy time 40%.',
            'Mentored engineers shipping three critical features.',
            'Reduced cloud spend through right-sizing workloads 18%.',
          ],
        },
      ],
    });

    const role = resume.experience?.[0];
    expect(role?.responsibilities).toEqual([]);
    expect(role?.achievements).toHaveLength(6);
    expect(role?.achievements?.[0]).toContain('API gateway');
  });

  it('drops boolean leftovers that would render as False.', () => {
    const resume = normalizeResumeExperienceBullets({
      skills: [],
      experience: [
        {
          responsibilities: [],
          achievements: [
            'Applied LLMs and RAG to clinical search workflows successfully.',
            false as unknown as string,
            'False',
            'true',
          ],
        },
      ],
    });

    expect(resume.experience?.[0]?.achievements).toEqual([
      'Applied LLMs and RAG to clinical search workflows successfully.',
    ]);
  });

  it('uses default bullet cap when achievementsCount is zero', () => {
    const resume = normalizeResumeExperienceBullets(
      {
        skills: [],
        experience: [
          {
            responsibilities: [],
            achievements: [
              'Owned API gateway delivery for the platform rollout.',
              'Led migration of billing services cutting latency 30%.',
              'Built observability dashboards for production incidents.',
            ],
          },
        ],
      },
      0,
    );

    expect(resume.experience?.[0]?.achievements).toHaveLength(3);
  });
});
