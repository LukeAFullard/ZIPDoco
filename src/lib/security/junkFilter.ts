export const DEFAULT_JUNK_PATTERNS: RegExp[] = [
  // macOS metadata & hidden files
  /^__MACOSX\//i,
  /\/__MACOSX\//i,
  /(^|\/)\.DS_Store$/i,
  /(^|\/)\._/i,
  /(^|\/)\.Spotlight-V100(\/|$)/i,
  /(^|\/)\.Trashes(\/|$)/i,
  /(^|\/)\.fseventsd(\/|$)/i,

  // Windows OS junk
  /(^|\/)Thumbs\.db$/i,
  /(^|\/)ehthumbs\.db$/i,
  /(^|\/)desktop\.ini$/i,
  /(^|\/)\$RECYCLE\.BIN(\/|$)/i,
  /(^|\/)System Volume Information(\/|$)/i,

  // Linux / desktop environment junk
  /(^|\/)\.directory$/i,
];

/**
 * Checks whether a given relative entry path matches OS junk/clutter patterns.
 */
export function isJunkPath(rawPath: string, customPatterns: RegExp[] = DEFAULT_JUNK_PATTERNS): boolean {
  if (!rawPath) return false;
  const normalized = rawPath.replace(/\\/g, '/');

  for (const pattern of customPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters out OS junk entries from a list of archive entries.
 */
export function filterJunkEntries<T>(
  entries: T[],
  getPath: (entry: T) => string,
  enabled: boolean = true,
  customPatterns: RegExp[] = DEFAULT_JUNK_PATTERNS
): T[] {
  if (!enabled) return entries;
  return entries.filter((entry) => !isJunkPath(getPath(entry), customPatterns));
}

/**
 * Calculates counts and breakdown of junk vs clean entries.
 */
export function getJunkStats<T>(
  entries: T[],
  getPath: (entry: T) => string,
  customPatterns: RegExp[] = DEFAULT_JUNK_PATTERNS
): { junkCount: number; cleanCount: number; totalCount: number } {
  let junkCount = 0;
  for (const entry of entries) {
    if (isJunkPath(getPath(entry), customPatterns)) {
      junkCount++;
    }
  }

  return {
    junkCount,
    cleanCount: entries.length - junkCount,
    totalCount: entries.length,
  };
}
