import {
  resolveFinalTitle,
  parseTitleMatchResult,
} from './schemas/title-match.schema';
import { TITLE_SIMILARITY_THRESHOLD } from '@resume-builder/shared';

describe('title match threshold', () => {
  it('keeps professional title when similarity >= 0.8', () => {
    const title = resolveFinalTitle(
      'Senior Software Engineer',
      { rootTitle: 'Senior Backend Engineer', similarity: 0.85 },
      TITLE_SIMILARITY_THRESHOLD,
    );
    expect(title).toBe('Senior Software Engineer');
  });

  it('uses rootTitle when similarity < 0.8', () => {
    const title = resolveFinalTitle(
      'Senior Software Engineer',
      { rootTitle: 'Staff Platform Engineer', similarity: 0.5 },
      TITLE_SIMILARITY_THRESHOLD,
    );
    expect(title).toBe('Staff Platform Engineer');
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
