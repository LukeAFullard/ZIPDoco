/**
 * Zip Bomb Defense & Expansion Ratio Verification Modules.
 */

export const DEFAULT_MAX_EXPANSION_RATIO = 100; // 100:1 ratio limit
export const DEFAULT_MAX_EXTRACT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB limit

export interface ArchiveEntryMeta {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  magicBytes?: Uint8Array;
}

export interface ZipBombCheckResult {
  isBombWarning: boolean;
  globalRatio: number;
  maxEntryRatio: number;
  totalCompressed: number;
  totalUncompressed: number;
  nestedArchivesDetected: boolean;
  reason?: string;
}

export class ZipBombMemoryExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipBombMemoryExceededError';
  }
}

/**
 * Common archive magic byte signatures for nested archive detection.
 */
export function detectNestedArchiveMagicBytes(headerBytes?: Uint8Array): string | null {
  if (!headerBytes || headerBytes.length < 4) return null;

  // PK.. (ZIP)
  if (headerBytes[0] === 0x50 && headerBytes[1] === 0x4b && headerBytes[2] === 0x03 && headerBytes[3] === 0x04) {
    return 'zip';
  }
  // 7z.. (7-Zip: 37 7A BC AF 27 1C)
  if (headerBytes[0] === 0x37 && headerBytes[1] === 0x7a && headerBytes[2] === 0xbc && headerBytes[3] === 0xaf) {
    return '7z';
  }
  // Rar! (RAR4/5: 52 61 72 21)
  if (headerBytes[0] === 0x52 && headerBytes[1] === 0x61 && headerBytes[2] === 0x72 && headerBytes[3] === 0x21) {
    return 'rar';
  }
  // GZ (1F 8B)
  if (headerBytes[0] === 0x1f && headerBytes[1] === 0x8b) {
    return 'gz';
  }
  // BZ2 (42 5A)
  if (headerBytes[0] === 0x42 && headerBytes[1] === 0x5a) {
    return 'bz2';
  }
  // XZ (FD 37 7A 58 5A 00)
  if (headerBytes[0] === 0xfd && headerBytes[1] === 0x37 && headerBytes[2] === 0x7a && headerBytes[3] === 0x58) {
    return 'xz';
  }

  return null;
}

/**
 * Calculates global expansion ratio (sum of uncompressed / sum of compressed).
 */
export function calculateExpansionRatio(entries: ArchiveEntryMeta[]): number {
  const totalCompressed = entries.reduce((acc, curr) => acc + Math.max(0, curr.compressedSize), 0);
  const totalUncompressed = entries.reduce((acc, curr) => acc + Math.max(0, curr.uncompressedSize), 0);

  if (totalCompressed === 0) {
    return totalUncompressed > 0 ? Infinity : 1;
  }

  return totalUncompressed / totalCompressed;
}

/**
 * Checks whether an archive triggers zip bomb safety warnings based on ratios or nested archive structures.
 */
export function checkZipBombThreshold(
  entries: ArchiveEntryMeta[],
  options?: { maxRatio?: number }
): ZipBombCheckResult {
  const maxRatio = options?.maxRatio ?? DEFAULT_MAX_EXPANSION_RATIO;

  let totalCompressed = 0;
  let totalUncompressed = 0;
  let maxEntryRatio = 0;
  let nestedArchivesDetected = false;

  for (const entry of entries) {
    const comp = Math.max(0, entry.compressedSize);
    const uncomp = Math.max(0, entry.uncompressedSize);

    totalCompressed += comp;
    totalUncompressed += uncomp;

    const entryRatio = comp === 0 ? (uncomp > 0 ? Infinity : 1) : uncomp / comp;
    if (entryRatio > maxEntryRatio) {
      maxEntryRatio = entryRatio;
    }

    if (entry.magicBytes && detectNestedArchiveMagicBytes(entry.magicBytes) !== null) {
      nestedArchivesDetected = true;
    }
  }

  const globalRatio = totalCompressed === 0 ? (totalUncompressed > 0 ? Infinity : 1) : totalUncompressed / totalCompressed;

  let isBombWarning = false;
  let reason: string | undefined;

  if (globalRatio > maxRatio) {
    isBombWarning = true;
    reason = `Global archive expansion ratio (${globalRatio.toFixed(1)}:1) exceeds maximum safe threshold (${maxRatio}:1).`;
  } else if (maxEntryRatio > maxRatio * 2 && totalUncompressed > 10 * 1024 * 1024) {
    // Single suspicious entry with >10MB uncompressed size
    isBombWarning = true;
    reason = `Single entry expansion ratio (${maxEntryRatio.toFixed(1)}:1) exceeds maximum safe threshold.`;
  }

  return {
    isBombWarning,
    globalRatio,
    maxEntryRatio,
    totalCompressed,
    totalUncompressed,
    nestedArchivesDetected,
    reason,
  };
}

/**
 * Worker Memory Circuit Breaker tracking cumulative bytes written to OPFS during extraction.
 */
export class WorkerMemoryCircuitBreaker {
  private totalBytesWritten = 0;
  public readonly maxAllowedBytes: number;

  constructor(maxAllowedBytes: number = DEFAULT_MAX_EXTRACT_BYTES) {
    this.maxAllowedBytes = maxAllowedBytes;
  }

  /**
   * Tracks bytes written to OPFS. Throws ZipBombMemoryExceededError if threshold is reached.
   */
  public trackBytesWritten(bytes: number): void {
    if (bytes < 0) return;
    this.totalBytesWritten += bytes;

    if (this.totalBytesWritten > this.maxAllowedBytes) {
      throw new ZipBombMemoryExceededError(
        `Extraction aborted: Cumulative bytes written (${(this.totalBytesWritten / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeded memory circuit breaker limit (${(this.maxAllowedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB).`
      );
    }
  }

  public getBytesWritten(): number {
    return this.totalBytesWritten;
  }

  public getRemainingBytes(): number {
    return Math.max(0, this.maxAllowedBytes - this.totalBytesWritten);
  }

  public reset(): void {
    this.totalBytesWritten = 0;
  }
}
