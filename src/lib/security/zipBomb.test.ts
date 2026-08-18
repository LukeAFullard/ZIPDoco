import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateExpansionRatio,
  checkZipBombThreshold,
  detectNestedArchiveMagicBytes,
  WorkerMemoryCircuitBreaker,
  ZipBombMemoryExceededError,
  type ArchiveEntryMeta,
} from './zipBomb';

describe('Zip Bomb Defense Module', () => {
  it('should correctly calculate global expansion ratio', () => {
    const entries: ArchiveEntryMeta[] = [
      { name: 'file1.txt', compressedSize: 100, uncompressedSize: 1000 },
      { name: 'file2.txt', compressedSize: 200, uncompressedSize: 5000 },
    ];

    const ratio = calculateExpansionRatio(entries);
    expect(ratio).toBe(20); // 6000 / 300 = 20
  });

  it('should flag zip bomb when expansion ratio exceeds 100:1 threshold', () => {
    const entries: ArchiveEntryMeta[] = [
      { name: 'bomb.txt', compressedSize: 100, uncompressedSize: 50000 }, // 500:1 ratio
    ];

    const result = checkZipBombThreshold(entries, { maxRatio: 100 });
    expect(result.isBombWarning).toBe(true);
    expect(result.globalRatio).toBe(500);
    expect(result.reason).toContain('Global archive expansion ratio');
  });

  it('should pass normal archive entries below threshold', () => {
    const entries: ArchiveEntryMeta[] = [
      { name: 'doc.pdf', compressedSize: 1000, uncompressedSize: 2000 },
      { name: 'image.png', compressedSize: 5000, uncompressedSize: 5200 },
    ];

    const result = checkZipBombThreshold(entries);
    expect(result.isBombWarning).toBe(false);
    expect(result.globalRatio).toBeLessThan(2);
  });

  it('should detect nested archive magic bytes', () => {
    const zipMagic = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const rarMagic = new Uint8Array([0x52, 0x61, 0x72, 0x21]);
    const plainText = new Uint8Array([0x48, 0x65, 0x6c, 0x6c]);

    expect(detectNestedArchiveMagicBytes(zipMagic)).toBe('zip');
    expect(detectNestedArchiveMagicBytes(rarMagic)).toBe('rar');
    expect(detectNestedArchiveMagicBytes(plainText)).toBeNull();
  });

  it('should set nestedArchivesDetected flag when nested archives exist in entries', () => {
    const entries: ArchiveEntryMeta[] = [
      {
        name: 'nested.zip',
        compressedSize: 1000,
        uncompressedSize: 2000,
        magicBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      },
    ];

    const result = checkZipBombThreshold(entries);
    expect(result.nestedArchivesDetected).toBe(true);
  });

  describe('WorkerMemoryCircuitBreaker', () => {
    let circuitBreaker: WorkerMemoryCircuitBreaker;

    beforeEach(() => {
      // Set small threshold (10MB) for testing
      circuitBreaker = new WorkerMemoryCircuitBreaker(10 * 1024 * 1024);
    });

    it('should allow writing within limits', () => {
      circuitBreaker.trackBytesWritten(5 * 1024 * 1024);
      expect(circuitBreaker.getBytesWritten()).toBe(5 * 1024 * 1024);
      expect(circuitBreaker.getRemainingBytes()).toBe(5 * 1024 * 1024);
    });

    it('should throw ZipBombMemoryExceededError when threshold is exceeded', () => {
      circuitBreaker.trackBytesWritten(8 * 1024 * 1024);
      expect(() => {
        circuitBreaker.trackBytesWritten(3 * 1024 * 1024);
      }).toThrow(ZipBombMemoryExceededError);
    });

    it('should reset tracker properly', () => {
      circuitBreaker.trackBytesWritten(5 * 1024 * 1024);
      circuitBreaker.reset();
      expect(circuitBreaker.getBytesWritten()).toBe(0);
    });
  });
});
