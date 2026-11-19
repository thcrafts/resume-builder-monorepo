import {
  computeSoftwareEngineeringCareerYears,
  computeYearsOfExperienceFromSimilarRoles,
  isTitleSimilarToJd,
  mergeMonthIntervals,
  normalizeJobTitleFamily,
  parseEmploymentDateRange,
  toMonthIndex,
} from '@resume-builder/shared';

describe('normalizeJobTitleFamily', () => {
  it('maps software roles into software_eng', () => {
    expect(normalizeJobTitleFamily('Software Engineer')).toBe('software_eng');
    expect(normalizeJobTitleFamily('Senior Frontend Engineer')).toBe(
      'software_eng',
    );
    expect(normalizeJobTitleFamily('Full-Stack Developer')).toBe('software_eng');
  });

  it('maps UX/UI design roles into design_ux', () => {
    expect(normalizeJobTitleFamily('UX Designer')).toBe('design_ux');
    expect(normalizeJobTitleFamily('Product Designer')).toBe('design_ux');
  });
});

describe('isTitleSimilarToJd', () => {
  it('matches frontend engineer to software engineer JD', () => {
    expect(
      isTitleSimilarToJd('Frontend Engineer', 'Software Engineer'),
    ).toBe(true);
  });

  it('does not match UX designer to software engineer JD', () => {
    expect(isTitleSimilarToJd('UX Designer', 'Software Engineer')).toBe(false);
  });
});

describe('computeYearsOfExperienceFromSimilarRoles', () => {
  it('sums similar roles, merges overlaps, and excludes dissimilar titles', () => {
    const reference = new Date(2024, 0, 1);
    const years = computeYearsOfExperienceFromSimilarRoles(
      [
        { title: 'UX Designer', date_range: '2017 - 2020' },
        { title: 'Software Engineer', date_range: '2020 - 2024' },
        { title: 'Frontend Engineer', date_range: '2022 - 2024' },
      ],
      'Software Engineer',
      reference,
    );

    // Jan 2020 through Dec 2024 after merge = 60 months = 5 years
    expect(years).toBe(5);
  });

  it('returns null when no similar parseable ranges exist', () => {
    expect(
      computeYearsOfExperienceFromSimilarRoles(
        [{ title: 'UX Designer', date_range: '2017 - 2020' }],
        'Software Engineer',
      ),
    ).toBeNull();
  });
});

describe('computeSoftwareEngineeringCareerYears', () => {
  it('uses earliest software/intern start through now, ignoring non-SE roles', () => {
    const reference = new Date(2024, 0, 1);
    const years = computeSoftwareEngineeringCareerYears(
      [
        { title: 'UX Designer', date_range: '2015 - 2017' },
        { title: 'Software Engineering Intern', date_range: '2018 - 2018' },
        { title: 'Software Engineer', date_range: '2020 - Present' },
      ],
      reference,
    );

    // Jan 2018 → Jan 2024 = 6 years
    expect(years).toBe(6);
  });

  it('returns null when no software-engineering roles exist', () => {
    expect(
      computeSoftwareEngineeringCareerYears([
        { title: 'UX Designer', date_range: '2017 - 2020' },
      ]),
    ).toBeNull();
  });
});

describe('parseEmploymentDateRange / mergeMonthIntervals', () => {
  it('parses Present against a reference date', () => {
    const reference = new Date(2024, 5, 15);
    expect(parseEmploymentDateRange('2020 – Present', reference)).toEqual({
      startMonth: toMonthIndex(2020, 0),
      endMonth: toMonthIndex(2024, 5),
    });
  });

  it('merges overlapping intervals without double-counting', () => {
    expect(
      mergeMonthIntervals([
        { startMonth: toMonthIndex(2020, 0), endMonth: toMonthIndex(2023, 11) },
        { startMonth: toMonthIndex(2022, 0), endMonth: toMonthIndex(2024, 11) },
      ]),
    ).toBe(60);
  });
});
