import { describe, it, expect } from 'vitest';
import { checkZipBombThreshold, type ArchiveEntryMeta } from '../lib/security/zipBomb';

describe('ZipBombWarningPanel Integration & Threshold Logic', () => {
  it('correctly flags zip bomb threshold exceeded for high ratio entries', () => {
    const suspiciousEntries: ArchiveEntryMeta[] = [
      { name: 'bomb.txt', compressedSize: 1000, uncompressedSize: 500000 }, // 500:1 ratio
    ];

    const result = checkZipBombThreshold(suspiciousEntries, { maxRatio: 100 });
    expect(result.isBombWarning).toBe(true);
    expect(result.globalRatio).toBe(500);
    expect(result.reason).toContain('exceeds maximum safe threshold');
  });

  it('passes normal compression ratios without warning', () => {
    const normalEntries: ArchiveEntryMeta[] = [
      { name: 'doc1.pdf', compressedSize: 800000, uncompressedSize: 1000000 }, // 1.25:1
      { name: 'image.png', compressedSize: 500000, uncompressedSize: 510000 },
    ];

    const result = checkZipBombThreshold(normalEntries, { maxRatio: 100 });
    expect(result.isBombWarning).toBe(false);
    expect(result.globalRatio).toBeLessThan(2);
  });

  it('detects nested archive containers in entries', () => {
    const nestedZipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const nestedArchiveEntries: ArchiveEntryMeta[] = [
      { name: 'inner.zip', compressedSize: 10000, uncompressedSize: 20000, magicBytes: nestedZipBytes },
    ];

    const result = checkZipBombThreshold(nestedArchiveEntries, { maxRatio: 100 });
    expect(result.nestedArchivesDetected).toBe(true);
  });
});
