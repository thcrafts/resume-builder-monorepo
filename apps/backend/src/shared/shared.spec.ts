import { resolveResumeSettings, DEFAULT_RESUME_SETTINGS } from '@resume-builder/shared';
import { sanitizeFilename } from '@resume-builder/shared';

describe('shared resume settings', () => {
  it('forces responsibilitiesCount to zero', () => {
    const settings = resolveResumeSettings({
      ...DEFAULT_RESUME_SETTINGS,
      responsibilitiesCount: 5,
    });
    expect(settings.responsibilitiesCount).toBe(0);
  });

  it('clamps achievements between defaults and max bullets', () => {
    const settings = resolveResumeSettings({
      ...DEFAULT_RESUME_SETTINGS,
      achievementsCount: 99,
    });
    expect(settings.achievementsCount).toBe(6);
  });
});

describe('sanitizeFilename', () => {
  it('strips special characters and normalizes spaces', () => {
    expect(sanitizeFilename('John O\'Neil Jr.')).toBe('John_ONeil_Jr');
    expect(sanitizeFilename('A B', '-')).toBe('A-B');
  });
});
