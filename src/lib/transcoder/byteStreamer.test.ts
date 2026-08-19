import { describe, it, expect } from 'vitest';
import { seekAndStreamByteRange } from './byteStreamer';

describe('seekAndStreamByteRange', () => {
  it('should seek and extract specific byte range without reading entire file', async () => {
    const rawData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const file = new File([rawData], 'test.bin');

    const result = await seekAndStreamByteRange(file, { start: 2, end: 6 });

    expect(result.bytesRead).toBe(4);
    expect(result.totalLength).toBe(10);
    expect(Array.from(result.data)).toEqual([30, 40, 50, 60]);
  });
});
