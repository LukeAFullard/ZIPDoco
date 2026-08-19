import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingRepacker, type RepackEntry } from './repacker';
import { createSession, resetMockOPFS } from '../storage/opfs';

describe('StreamingRepacker', () => {
  beforeEach(() => {
    resetMockOPFS();
  });

  it('should stream repacked entries into ZIP output via fflate', async () => {
    const { sessionDir } = await createSession('repack_test_session');
    const outputHandle = await sessionDir.getFileHandle('output.zip', { create: true });

    const repacker = new StreamingRepacker();
    const testEntries: RepackEntry[] = [
      { path: 'doc1.txt', data: new TextEncoder().encode('Hello World') },
      { path: 'doc2.txt', data: new TextEncoder().encode('ZipDoco Repacker Test') },
    ];

    const bytesWritten = await repacker.repackToOPFS(testEntries, outputHandle);

    expect(bytesWritten).toBeGreaterThan(0);
    const file = await outputHandle.getFile();
    expect(file.size).toBe(bytesWritten);
  });
});
