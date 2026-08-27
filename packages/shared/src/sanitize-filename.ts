export function sanitizeFilename(name: string, separator = '_'): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, separator);
}
