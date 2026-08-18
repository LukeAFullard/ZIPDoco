export interface PathValidationResult {
  safe: boolean;
  sanitizedPath: string;
  blockedReason?: string;
}

export interface SymlinkValidationResult {
  safe: boolean;
  resolvedTarget: string;
  blockedReason?: string;
}

/**
 * Sanitizes a file path from an archive entry by:
 * - Removing null bytes
 * - Normalizing backslashes to forward slashes
 * - Stripping Windows drive letters (e.g. C:) and UNC network prefixes (e.g. //server/share)
 * - Removing leading slashes
 * - Resolving relative '.' and '..' path components safely without escaping root
 */
export function sanitizePath(rawPath: string): string {
  if (!rawPath) return '';

  // 1. Remove null bytes
  let path = rawPath.replace(/\0/g, '');

  // 2. Normalize backslashes to forward slashes
  path = path.replace(/\\/g, '/');

  // 3. Strip Windows drive letters (e.g., "C:", "D:/")
  path = path.replace(/^[a-zA-Z]:/, '');

  // 4. Strip UNC network prefixes (e.g., "//server/share/")
  if (/^\/\/[^/]+\/[^/]+/.test(path) && !path.startsWith('///')) {
    path = path.replace(/^\/\/[^/]+\/[^/]+(?:\/|$)/, '');
  }

  // 5. Strip leading slashes
  path = path.replace(/^\/+/, '');

  // 6. Split segments and resolve relative paths
  const segments = path.split('/');
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (stack.length > 0) {
        stack.pop();
      }
      // If stack is empty, '..' cannot escape higher, so it's safely dropped
    } else {
      stack.push(segment);
    }
  }

  return stack.join('/');
}

/**
 * Validates whether an archive entry path is safe to extract.
 */
export function validatePath(rawPath: string): PathValidationResult {
  if (!rawPath || rawPath.trim() === '') {
    return { safe: false, sanitizedPath: '', blockedReason: 'Empty path' };
  }

  if (rawPath.includes('\0')) {
    const sanitized = sanitizePath(rawPath);
    return {
      safe: false,
      sanitizedPath: sanitized,
      blockedReason: 'Null byte injection detected in path',
    };
  }

  const sanitized = sanitizePath(rawPath);

  // Detect explicit directory traversal attempt or unsafe characters
  const normalized = rawPath.replace(/\\/g, '/');
  const hasTraversal =
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(rawPath) ||
    normalized.includes('../') ||
    normalized.endsWith('/..') ||
    normalized === '..';

  if (hasTraversal) {
    return {
      safe: true, // Sanitized path is rendered safe
      sanitizedPath: sanitized,
      blockedReason: 'Path traversal components sanitized',
    };
  }

  return {
    safe: true,
    sanitizedPath: sanitized,
  };
}

/**
 * Validates a symlink target relative to the entry's parent directory
 * to ensure it does not escape the extraction root directory.
 */
export function validateSymlinkTarget(
  linkTarget: string,
  entryPath: string
): SymlinkValidationResult {
  if (!linkTarget || linkTarget.trim() === '') {
    return { safe: false, resolvedTarget: '', blockedReason: 'Empty symlink target' };
  }

  if (linkTarget.includes('\0')) {
    return { safe: false, resolvedTarget: '', blockedReason: 'Null byte injection in symlink target' };
  }

  const normalizedTarget = linkTarget.replace(/\\/g, '/');

  // Absolute target (leading slash or Windows drive letter)
  if (normalizedTarget.startsWith('/') || /^[a-zA-Z]:/.test(linkTarget)) {
    const sanitized = sanitizePath(linkTarget);
    return {
      safe: false,
      resolvedTarget: sanitized,
      blockedReason: 'Symlink points to absolute path outside root',
    };
  }

  // Get parent directory of the entry
  const sanitizedEntry = sanitizePath(entryPath);
  const entryParts = sanitizedEntry.split('/').filter(Boolean);
  const entryDirParts = entryParts.slice(0, -1); // parent directory components

  const targetParts = normalizedTarget.split('/');
  const stack = [...entryDirParts];

  for (const part of targetParts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length === 0) {
        // Escapes root!
        return {
          safe: false,
          resolvedTarget: sanitizePath(normalizedTarget),
          blockedReason: 'Symlink target escapes extraction root',
        };
      }
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return {
    safe: true,
    resolvedTarget: stack.join('/'),
  };
}

/**
 * Path Sanitizer Tracker to log and keep metrics of blocked/sanitized paths.
 */
export class SanitizerTracker {
  private blockedCount = 0;
  private sanitizedCount = 0;

  public processPath(rawPath: string): { sanitizedPath: string; isModified: boolean; safe: boolean } {
    const validation = validatePath(rawPath);
    const sanitized = validation.sanitizedPath;

    if (!validation.safe) {
      this.blockedCount++;
    } else if (validation.blockedReason || rawPath !== sanitized) {
      this.sanitizedCount++;
    }

    return {
      sanitizedPath: sanitized,
      isModified: rawPath !== sanitized,
      safe: validation.safe,
    };
  }

  public processSymlink(linkTarget: string, entryPath: string): SymlinkValidationResult {
    const res = validateSymlinkTarget(linkTarget, entryPath);
    if (!res.safe) {
      this.blockedCount++;
    }
    return res;
  }

  public getStats() {
    return {
      blockedCount: this.blockedCount,
      sanitizedCount: this.sanitizedCount,
    };
  }

  public reset() {
    this.blockedCount = 0;
    this.sanitizedCount = 0;
  }
}
