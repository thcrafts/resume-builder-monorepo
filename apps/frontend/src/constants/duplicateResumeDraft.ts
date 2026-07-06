export const DUPLICATE_RESUME_DRAFT_KEY = "duplicateResumeDraft";

export interface DuplicateResumeDraft {
  companyName: string;
  roleType: string;
  jobDescription: string;
  aiModel: string;
  aiVersion: string;
  jsonContent: string;
}

export function saveDuplicateResumeDraft(draft: DuplicateResumeDraft): void {
  sessionStorage.setItem(DUPLICATE_RESUME_DRAFT_KEY, JSON.stringify(draft));
}

export function loadDuplicateResumeDraft(): DuplicateResumeDraft | null {
  const raw = sessionStorage.getItem(DUPLICATE_RESUME_DRAFT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DuplicateResumeDraft;
  } catch {
    return null;
  }
}

export function clearDuplicateResumeDraft(): void {
  sessionStorage.removeItem(DUPLICATE_RESUME_DRAFT_KEY);
}
