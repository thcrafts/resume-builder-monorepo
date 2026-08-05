const START_DATE_KEY = "resumeFilter.startDate";
const END_DATE_KEY = "resumeFilter.endDate";

export function readStoredDateFilter(): {
  startDate: string | null;
  endDate: string | null;
} {
  return {
    startDate: sessionStorage.getItem(START_DATE_KEY),
    endDate: sessionStorage.getItem(END_DATE_KEY),
  };
}

export function writeStoredDateFilter(startDate: string, endDate: string): void {
  sessionStorage.setItem(START_DATE_KEY, startDate);
  sessionStorage.setItem(END_DATE_KEY, endDate);
}

export function clearStoredDateFilter(): void {
  sessionStorage.removeItem(START_DATE_KEY);
  sessionStorage.removeItem(END_DATE_KEY);
}
