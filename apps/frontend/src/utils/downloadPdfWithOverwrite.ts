const DB_NAME = "resume-builder-pdf-handles";
const STORE_NAME = "file-handles";
const DB_VERSION = 1;

type WellKnownDirectory =
  | "desktop"
  | "documents"
  | "downloads"
  | "music"
  | "pictures"
  | "videos";

type ShowSaveFilePickerOptions = {
  suggestedName?: string;
  startIn?: WellKnownDirectory | FileSystemHandle;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
};

type FileSystemPermissionMode = "read" | "readwrite";

type FileSystemFileHandleWithPermission = FileSystemFileHandle & {
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

function supportsSaveFilePicker(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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

async function getStoredFileHandle(
  filename: string,
): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(filename);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve((request.result as FileSystemFileHandle | undefined) ?? null);
    };
  });
}

async function storeFileHandle(
  filename: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, filename);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function ensureReadWritePermission(
  handle: FileSystemFileHandleWithPermission,
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

async function writeToFileHandle(
  handle: FileSystemFileHandle,
  pdfBlob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(pdfBlob);
  await writable.close();
}

async function pickAndSavePdf(
  filename: string,
  pdfBlob: Blob,
): Promise<FileSystemFileHandle> {
  const handle = await (
    window as Window & {
      showSaveFilePicker: (
        options?: ShowSaveFilePickerOptions,
      ) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker({
    suggestedName: filename,
    startIn: "downloads",
    types: [
      {
        description: "PDF",
        accept: { "application/pdf": [".pdf"] },
      },
    ],
  });

  await writeToFileHandle(handle, pdfBlob);
  await storeFileHandle(filename, handle);
  return handle;
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
 * Save PDF into Downloads (via save picker) and overwrite on later downloads.
 *
 * Chrome blocks directory access to Downloads, but allows saving/overwriting
 * individual files there with showSaveFilePicker + a remembered file handle.
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

  if (!supportsSaveFilePicker()) {
    fallbackAnchorDownload(pdfBlob, filename);
    return { mode: "fallback", filename };
  }

  try {
    const existing = await getStoredFileHandle(filename);
    if (existing) {
      const allowed = await ensureReadWritePermission(
        existing as FileSystemFileHandleWithPermission,
      );
      if (allowed) {
        await writeToFileHandle(existing, pdfBlob);
        return { mode: "overwrite", filename };
      }
    }

    await pickAndSavePdf(filename, pdfBlob);
    return { mode: "created", filename };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    fallbackAnchorDownload(pdfBlob, filename);
    return { mode: "fallback", filename };
  }
}
