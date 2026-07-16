interface ShowDirectoryPickerOptions {
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
}

interface WindowWithDirectoryPicker {
  showDirectoryPicker: (
    options?: ShowDirectoryPickerOptions,
  ) => Promise<FileSystemDirectoryHandle>;
}

declare global {
  interface Window {
    showDirectoryPicker?: WindowWithDirectoryPicker["showDirectoryPicker"];
  }
}

export {};
