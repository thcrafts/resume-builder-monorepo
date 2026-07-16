const DB_NAME = "resume-builder-downloads";
const STORE_NAME = "handles";
const HANDLE_KEY = "downloads-root";
const PICKER_ID = "resume-builder-downloads";

type ShowDirectoryPickerOptions = {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos"
    | FileSystemHandle;
};

type FileSystemPermissionMode = "read" | "readwrite";

type FileSystemHandleWithPermission = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: {
    mode?: FileSystemPermissionMode;
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: FileSystemPermissionMode;
  }) => Promise<PermissionState>;
};

export function getFilenameFromContentDisposition(
  contentDisposition: string | undefined,
  fallback: string,
): string {
  if (!contentDisposition) {
    return fallback;
  }

  const filenameMatch = contentDisposition.match(
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
  );
  if (filenameMatch?.[1]) {
    return filenameMatch[1].replace(/['"]/g, "");
  }

  return fallback;
}

function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(HANDLE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
    };
  });
}

async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, HANDLE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function ensureReadWritePermission(
  handle: FileSystemHandleWithPermission,
): Promise<boolean> {
  const opts = { mode: "readwrite" as const };

  if (typeof handle.queryPermission === "function") {
    const state = await handle.queryPermission(opts);
    if (state === "granted") {
      return true;
    }
  }

  if (typeof handle.requestPermission === "function") {
    const state = await handle.requestPermission(opts);
    return state === "granted";
  }

  return true;
}

async function resolveDownloadsRoot(): Promise<FileSystemDirectoryHandle> {
  const existing = await getStoredDirectoryHandle();
  if (existing) {
    const allowed = await ensureReadWritePermission(
      existing as FileSystemHandleWithPermission,
    );
    if (allowed) {
      return existing;
    }
  }

  const handle = await (
    window as Window & {
      showDirectoryPicker: (
        options?: ShowDirectoryPickerOptions,
      ) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker({
    id: PICKER_ID,
    mode: "readwrite",
    startIn: "downloads",
  });

  await storeDirectoryHandle(handle);
  return handle;
}

async function fileExists(
  root: FileSystemDirectoryHandle,
  filename: string,
): Promise<boolean> {
  try {
    await root.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete existing same-named file if present, then write the new PDF.
 */
async function writePdfReplacingExisting(
  root: FileSystemDirectoryHandle,
  filename: string,
  pdfBlob: Blob,
): Promise<boolean> {
  const existed = await fileExists(root, filename);

  if (existed) {
    await root.removeEntry(filename);
  }

  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(pdfBlob);
  await writable.close();

  return existed;
}

function fallbackAnchorDownload(pdfBlob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export type PdfOverwriteDownloadResult = {
  mode: "overwrite" | "created" | "fallback";
  filename: string;
};

/**
 * Saves a PDF directly into the user's Downloads folder.
 * If a file with the same name already exists, it is removed and rewritten.
 *
 * Chrome/Edge: grant Downloads once; later downloads reuse permission.
 */
export async function downloadPdfWithOverwrite(
  pdfBlob: Blob,
  options: {
    contentDisposition?: string;
    fallbackFilename: string;
  },
): Promise<PdfOverwriteDownloadResult> {
  const filename = getFilenameFromContentDisposition(
    options.contentDisposition,
    options.fallbackFilename,
  );

  if (!supportsDirectoryPicker()) {
    fallbackAnchorDownload(pdfBlob, filename);
    return { mode: "fallback", filename };
  }

  try {
    const root = await resolveDownloadsRoot();
    const replaced = await writePdfReplacingExisting(root, filename, pdfBlob);
    return {
      mode: replaced ? "overwrite" : "created",
      filename,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    fallbackAnchorDownload(pdfBlob, filename);
    return { mode: "fallback", filename };
  }
}
