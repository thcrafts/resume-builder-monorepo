type WellKnownDirectory =
  | "desktop"
  | "documents"
  | "downloads"
  | "music"
  | "pictures"
  | "videos";

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  startIn?: WellKnownDirectory | FileSystemHandle;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
}

interface WindowWithSaveFilePicker {
  showSaveFilePicker: (
    options?: ShowSaveFilePickerOptions,
  ) => Promise<FileSystemFileHandle>;
}

declare global {
  interface Window {
    showSaveFilePicker?: WindowWithSaveFilePicker["showSaveFilePicker"];
  }
}

export {};
