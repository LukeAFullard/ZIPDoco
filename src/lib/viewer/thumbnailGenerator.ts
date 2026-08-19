const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'avif',
]);

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()!.toLowerCase();
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return IMAGE_EXTENSIONS.has(ext);
}

export interface ArchiveEntryLike {
  name: string;
}

/**
 * Detects if an archive is image-heavy (>50% image entries).
 */
export function isImageHeavyArchive(entries: ArchiveEntryLike[]): boolean {
  if (!entries || entries.length === 0) return false;

  // Filter out directory entries ending with '/'
  const files = entries.filter((e) => !e.name.endsWith('/'));
  if (files.length === 0) return false;

  const imageCount = files.filter((f) => isImageFile(f.name)).length;
  return imageCount / files.length >= 0.5;
}

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Generates a downscaled image thumbnail data URL using HTML Canvas.
 * Supports image data as Blob, Uint8Array, or image source URL string.
 */
export async function generateThumbnail(
  source: Blob | Uint8Array | string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const maxWidth = options.maxWidth || 200;
  const maxHeight = options.maxHeight || 200;
  const quality = options.quality || 0.8;

  const createSvgFallback = (label?: string) =>
    `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="%2326313A"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23D9A54A" font-family="monospace" font-size="14">${encodeURIComponent(label || 'Image')}</text></svg>`;

  // In non-browser / unit test environment without Image or DOM
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return typeof source === 'string' && (source.startsWith('http') || source.startsWith('data:'))
      ? source
      : createSvgFallback();
  }

  let srcUrl = '';
  let revokeUrl = false;

  if (typeof source === 'string') {
    if (source.startsWith('http') || source.startsWith('data:')) {
      srcUrl = source;
    } else {
      return createSvgFallback('Image Preview');
    }
  } else if (source instanceof Blob) {
    srcUrl = URL.createObjectURL(source);
    revokeUrl = true;
  } else if (source instanceof Uint8Array) {
    const blob = new Blob([source as BlobPart]);
    srcUrl = URL.createObjectURL(blob);
    revokeUrl = true;
  }

  try {
    return await new Promise<string>((resolve, _reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(srcUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(srcUrl);
        } finally {
          if (revokeUrl) {
            URL.revokeObjectURL(srcUrl);
          }
        }
      };

      img.onerror = () => {
        if (revokeUrl) {
          URL.revokeObjectURL(srcUrl);
        }
        resolve(createSvgFallback('Image Preview'));
      };

      img.src = srcUrl;
    });
  } catch {
    if (revokeUrl) {
      URL.revokeObjectURL(srcUrl);
    }
    return createSvgFallback('Image Preview');
  }
}
