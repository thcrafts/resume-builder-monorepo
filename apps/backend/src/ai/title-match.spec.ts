import {
  resolveFinalTitle,
  parseTitleMatchResult,
} from './schemas/title-match.schema';
import { TITLE_SIMILARITY_THRESHOLD } from '@resume-builder/shared';

describe('title match threshold', () => {
  it('keeps the professional title even when JD similarity is high', () => {
    const title = resolveFinalTitle(
      'Senior Software Engineer',
      { rootTitle: 'Senior Backend Engineer', similarity: 0.85 },
      TITLE_SIMILARITY_THRESHOLD,
    );
    expect(title).toBe('Senior Software Engineer');
  });

  it('keeps the professional title when the JD occupation differs', () => {
    const title = resolveFinalTitle(
      'Senior Software Engineer',
      { rootTitle: 'Low Code Application Developer', similarity: 0.2 },
      TITLE_SIMILARITY_THRESHOLD,
    );
    expect(title).toBe('Senior Software Engineer');
  });

  it('falls back to rootTitle only when professional title is empty', () => {
    const title = resolveFinalTitle(
      '  ',
      { rootTitle: 'Software Engineer', similarity: 0.1 },
      TITLE_SIMILARITY_THRESHOLD,
    );
    expect(title).toBe('Software Engineer');
  });

  it('parses title match JSON', () => {
    const result = parseTitleMatchResult({
      rootTitle: 'Backend Engineer',
      similarity: 0.9,
    });
    expect(result.rootTitle).toBe('Backend Engineer');
    expect(result.similarity).toBe(0.9);
  });
});
