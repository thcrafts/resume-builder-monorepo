import {
  computeYearsOfExperienceFromSimilarRoles,
  isTitleSimilarToJd,
  mergeMonthIntervals,
  normalizeJobTitleFamily,
  parseEmploymentDateRange,
  toMonthIndex,
} from './job-title-family';

describe('normalizeJobTitleFamily', () => {
  it('maps software roles into software_eng', () => {
    expect(normalizeJobTitleFamily('Software Engineer')).toBe('software_eng');
    expect(normalizeJobTitleFamily('Senior Frontend Engineer')).toBe(
      'software_eng',
    );
    expect(normalizeJobTitleFamily('Full-Stack Developer')).toBe('software_eng');
    expect(normalizeJobTitleFamily('Backend Engineer')).toBe('software_eng');
  });

  it('maps UX/UI design roles into design_ux', () => {
    expect(normalizeJobTitleFamily('UX Designer')).toBe('design_ux');
    expect(normalizeJobTitleFamily('UI/UX Designer')).toBe('design_ux');
    expect(normalizeJobTitleFamily('Product Designer')).toBe('design_ux');
  });

  it('keeps design engineer as software_eng', () => {
    expect(normalizeJobTitleFamily('Software Design Engineer')).toBe(
      'software_eng',
    );
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

  it('returns false when either side is other', () => {
    expect(isTitleSimilarToJd('Office Manager', 'Software Engineer')).toBe(
      false,
    );
  });
});

describe('parseEmploymentDateRange', () => {
  it('parses year ranges through end of year', () => {
    const interval = parseEmploymentDateRange('2018 - 2022');
    expect(interval).toEqual({
      startMonth: toMonthIndex(2018, 0),
      endMonth: toMonthIndex(2022, 11),
    });
  });

  it('treats Present as the reference date', () => {
    const reference = new Date(2024, 5, 15);
    const interval = parseEmploymentDateRange('2020 – Present', reference);
    expect(interval).toEqual({
      startMonth: toMonthIndex(2020, 0),
      endMonth: toMonthIndex(2024, 5),
    });
  });
});

describe('mergeMonthIntervals', () => {
  it('merges overlapping intervals', () => {
    const months = mergeMonthIntervals([
      { startMonth: toMonthIndex(2020, 0), endMonth: toMonthIndex(2023, 11) },
      { startMonth: toMonthIndex(2022, 0), endMonth: toMonthIndex(2024, 11) },
    ]);
    // Jan 2020 through Dec 2024 = 5 years = 60 months
    expect(months).toBe(60);
  });
});

describe('computeYearsOfExperienceFromSimilarRoles', () => {
  it('sums similar roles and excludes dissimilar titles', () => {
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

    // SWE 2020-2023 + Frontend overlap into 2024 merged = Jan 2020–Dec 2023? 
    // 2020-2024 year-only = Jan 2020–Dec 2024 = 60 months = 5 years
    // Frontend 2022-2024 overlaps → still 5 years
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
