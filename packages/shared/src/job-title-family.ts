export type JobTitleFamily =
  | 'software_eng'
  | 'design_ux'
  | 'product'
  | 'data'
  | 'other';

function normalizeTitleText(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a job title to a coarse family used for JD weave eligibility.
 * Frontend/backend/full-stack share software_eng; UX/UI design is separate.
 */
export function normalizeJobTitleFamily(title: string): JobTitleFamily {
  const t = normalizeTitleText(title);
  if (!t) {
    return 'other';
  }

  if (
    /\b(ux|ui)\b/.test(t) ||
    /\b(product\s+)?design(er|ing)?\b/.test(t) ||
    /\bvisual\s+design/.test(t) ||
    /\binteraction\s+design/.test(t)
  ) {
    // "Software Design Engineer" / "Design Engineer" stay engineering.
    if (
      /\b(software|platform|systems?|hardware)\s+design/.test(t) ||
      /\bdesign\s+engineer\b/.test(t)
    ) {
      return 'software_eng';
    }
    return 'design_ux';
  }

  if (
    /\bproduct\s+manag/.test(t) ||
    /\b\bpm\b/.test(t) ||
    /\bproduct\s+owner\b/.test(t)
  ) {
    return 'product';
  }

  if (
    /\bdata\s+(scientist|science|analyst|analytics|engineer)\b/.test(t) ||
    /\bmachine\s+learning\b/.test(t) ||
    /\b\bml\s+engineer\b/.test(t) ||
    /\bai\s+engineer\b/.test(t)
  ) {
    return 'data';
  }

  // Software engineering internships count as software_eng.
  if (
    /\bintern(ship)?\b/.test(t) &&
    /\b(software|swe|sde|developer|engineer|programming|full[\s-]?stack|frontend|front[\s-]?end|backend|back[\s-]?end)\b/.test(
      t,
    )
  ) {
    return 'software_eng';
  }

  if (
    /\b(software|full[\s-]?stack|frontend|front[\s-]?end|backend|back[\s-]?end|swe|sde|devops|sre|platform|mobile|ios|android|web)\b/.test(
      t,
    ) ||
    /\b(developer|programmer|engineer)\b/.test(t)
  ) {
    return 'software_eng';
  }

  return 'other';
}

export function isSoftwareEngineeringRelatedTitle(title: string): boolean {
  return normalizeJobTitleFamily(title) === 'software_eng';
}

/** True when company title and JD role title share the same family. */
export function isTitleSimilarToJd(
  companyTitle: string,
  jdRoleTitle: string,
): boolean {
  const companyFamily = normalizeJobTitleFamily(companyTitle);
  const jdFamily = normalizeJobTitleFamily(jdRoleTitle);
  if (companyFamily === 'other' || jdFamily === 'other') {
    return false;
  }
  return companyFamily === jdFamily;
}

export interface MonthInterval {
  startMonth: number;
  endMonth: number;
}

/** Convert a calendar date to months since year 0. */
export function toMonthIndex(year: number, monthIndex0: number): number {
  return year * 12 + monthIndex0;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Parse a single date token like "2020", "Jan 2020", "01/2020". */
export function parseFlexibleDatePart(
  raw: string,
  referenceDate: Date = new Date(),
): { year: number; month: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/\b(present|current|now|ongoing)\b/i.test(trimmed)) {
    return {
      year: referenceDate.getFullYear(),
      month: referenceDate.getMonth(),
    };
  }

  const monthYear = trimmed.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{4})$/i,
  );
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase().replace(/\.$/, '')];
    const year = Number(monthYear[2]);
    if (month != null && Number.isFinite(year)) {
      return { year, month };
    }
  }

  const numeric = trimmed.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (numeric) {
    const month = Number(numeric[1]) - 1;
    const year = Number(numeric[2]);
    if (month >= 0 && month <= 11 && Number.isFinite(year)) {
      return { year, month };
    }
  }

  const yearOnly = trimmed.match(/\b((?:19|20)\d{2})\b/);
  if (yearOnly) {
    return { year: Number(yearOnly[1]), month: 0 };
  }

  return null;
}

/**
 * Parse employment date_range into an inclusive month interval.
 * Supports "2020 – Present", "Jan 2019 – Mar 2021", "2018-2022".
 */
export function parseEmploymentDateRange(
  dateRange: string,
  referenceDate: Date = new Date(),
): MonthInterval | null {
  const trimmed = dateRange.trim();
  if (!trimmed) {
    return null;
  }

  // Prefer en/em dashes and " to " before ASCII hyphen so "02/2022-Present" still
  // splits once, and unicode minus signs are treated as range separators too.
  const rangeSeparators = /\s*(?:\u2013|\u2014|\u2212|\sto\s)\s*/i;
  let parts = trimmed.split(rangeSeparators);
  if (parts.length < 2) {
    parts = trimmed.split(/\s*-\s*/);
  }
  // "02/2022-06/2025" can over-split if other hyphens appear; keep first/last.
  if (parts.length > 2) {
    parts = [parts[0], parts[parts.length - 1]];
  }
  if (parts.length < 2) {
    const single = parseFlexibleDatePart(trimmed, referenceDate);
    if (!single) {
      return null;
    }
    const month = toMonthIndex(single.year, single.month);
    return { startMonth: month, endMonth: month };
  }

  const start = parseFlexibleDatePart(parts[0], referenceDate);
  const end = parseFlexibleDatePart(parts.slice(1).join(' - '), referenceDate);
  if (!start || !end) {
    return null;
  }

  const startMonth = toMonthIndex(start.year, start.month);
  let endMonth = toMonthIndex(end.year, end.month);
  // Year-only end dates like "2018-2022" count through Dec of the end year.
  if (/^\s*(?:19|20)\d{2}\s*$/.test(parts[1] ?? '') && end.month === 0) {
    endMonth = toMonthIndex(end.year, 11);
  }

  if (endMonth < startMonth) {
    return null;
  }

  return { startMonth, endMonth };
}

/** Merge overlapping/adjacent month intervals; return total covered months. */
export function mergeMonthIntervals(intervals: MonthInterval[]): number {
  if (intervals.length === 0) {
    return 0;
  }

  const sorted = [...intervals].sort((a, b) => a.startMonth - b.startMonth);
  const merged: MonthInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.startMonth <= last.endMonth + 1) {
      last.endMonth = Math.max(last.endMonth, current.endMonth);
    } else {
      merged.push({ ...current });
    }
  }

  return merged.reduce(
    (sum, interval) => sum + (interval.endMonth - interval.startMonth + 1),
    0,
  );
}

/**
 * Profile-cached career years: from the start of the earliest
 * software-engineering-related role (including internships) until now.
 * Calendar span (not summed employment). Returns null if none parseable.
 */
export function computeSoftwareEngineeringCareerYears(
  companies: Array<{ title: string; date_range: string }>,
  referenceDate: Date = new Date(),
): number | null {
  let earliestStart: number | null = null;

  for (const company of companies) {
    if (!isSoftwareEngineeringRelatedTitle(company.title)) {
      continue;
    }
    const interval = parseEmploymentDateRange(
      company.date_range,
      referenceDate,
    );
    if (!interval) {
      continue;
    }
    if (earliestStart == null || interval.startMonth < earliestStart) {
      earliestStart = interval.startMonth;
    }
  }

  if (earliestStart == null) {
    return null;
  }

  const nowMonth = toMonthIndex(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
  return Math.floor(Math.max(0, nowMonth - earliestStart) / 12);
}
