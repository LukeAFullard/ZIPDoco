import { isImageFile, getFileExtension } from './thumbnailGenerator';

export interface ComicArchiveEntry {
  name: string;
  compressedSize?: number;
  uncompressedSize?: number;
  content?: string | Uint8Array;
}

export interface ComicPage {
  pageNumber: number;
  name: string;
  content?: string | Uint8Array;
}

export interface ComicArchiveInfo {
  title: string;
  isComic: boolean;
  format: 'cbz' | 'cbr' | 'cb7' | 'cbt' | 'generic';
  totalPages: number;
  pages: ComicPage[];
}

/**
 * Checks if filename or archive entries suggest a comic book archive (CBR/CBZ/CB7/CBT).
 */
export function isComicArchive(
  archiveName: string,
  entries: ComicArchiveEntry[]
): boolean {
  const ext = getFileExtension(archiveName);
  if (['cbz', 'cbr', 'cb7', 'cbt'].includes(ext)) {
    return true;
  }

  // If archive contains image entries that make up >50% of the non-directory entries
  const fileEntries = entries.filter(e => !e.name.endsWith('/'));
  if (fileEntries.length === 0) return false;

  const imageEntries = fileEntries.filter(e => isImageFile(e.name));
  return imageEntries.length / fileEntries.length >= 0.5 && imageEntries.length >= 2;
}

/**
 * Extracts and sorts comic book pages naturally by filename.
 */
export function extractComicPages(entries: ComicArchiveEntry[]): ComicPage[] {
  const imageEntries = entries.filter(
    e => !e.name.endsWith('/') && isImageFile(e.name)
  );

  // Natural alphanumeric sort (so page_2.jpg comes before page_10.jpg)
  imageEntries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  return imageEntries.map((entry, idx) => ({
    pageNumber: idx + 1,
    name: entry.name,
    content: entry.content,
  }));
}

/**
 * Parses comic archive information from entry metadata.
 */
export function parseComicInfo(
  archiveName: string,
  entries: ComicArchiveEntry[]
): ComicArchiveInfo {
  const ext = getFileExtension(archiveName);
  let format: ComicArchiveInfo['format'] = 'generic';

  if (ext === 'cbz') format = 'cbz';
  else if (ext === 'cbr') format = 'cbr';
  else if (ext === 'cb7') format = 'cb7';
  else if (ext === 'cbt') format = 'cbt';

  const isComic = isComicArchive(archiveName, entries);
  const pages = isComic ? extractComicPages(entries) : [];

  // Extract clean title from filename
  const title = archiveName.replace(/\.(cbz|cbr|cb7|cbt|zip|rar|tar|7z)$/i, '');

  return {
    title,
    isComic,
    format,
    totalPages: pages.length,
    pages,
  };
}

/**
 * Formats image page content into an img displayable URL.
 */
export function getComicPageSrc(page: ComicPage): string {
  if (!page.content) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="%2326313A"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23EEF0EC" font-family="sans-serif" font-size="20">Page ${page.pageNumber}: ${encodeURIComponent(page.name)}</text></svg>`;
  }

  if (typeof page.content === 'string') {
    if (page.content.startsWith('data:image/') || page.content.startsWith('http://') || page.content.startsWith('https://')) {
      return page.content;
    }
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="%2326313A"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23D9A54A" font-family="sans-serif" font-size="28">Page ${page.pageNumber}</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23EEF0EC" font-family="monospace" font-size="18">${encodeURIComponent(page.name)}</text></svg>`;
  }

  if (page.content instanceof Uint8Array) {
    const blob = new Blob([page.content as BlobPart], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }

  return '';
}
