const DOWNLOADED_RESUME_PDFS_KEY = "downloadedResumePdfs";

function readIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DOWNLOADED_RESUME_PDFS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>): void {
  sessionStorage.setItem(
    DOWNLOADED_RESUME_PDFS_KEY,
    JSON.stringify([...ids]),
  );
}

export function loadDownloadedResumePdfIds(): Set<string> {
  return readIds();
}

export function hasDownloadedResumePdf(id: string): boolean {
  return readIds().has(id);
}

export function markResumePdfDownloaded(id: string): void {
  const ids = readIds();
  ids.add(id);
  writeIds(ids);
}
