import {
  parseExperienceSkillsResult,
} from './experience-skills.schema';

describe('parseExperienceSkillsResult', () => {
  it('parses a skills array', () => {
    expect(
      parseExperienceSkillsResult({
        skills: ['TypeScript', 'React', 'AWS'],
      }),
    ).toEqual({
      skills: ['TypeScript', 'React', 'AWS'],
    });
  });

  it('throws when skills are missing', () => {
    expect(() => parseExperienceSkillsResult({})).toThrow(
      'Invalid experience skills response',
    );
  });
});
