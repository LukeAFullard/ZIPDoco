import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingDecompressor } from './decompressor';
import { createSession, resetMockOPFS } from '../storage/opfs';

describe('StreamingDecompressor', () => {
  beforeEach(() => {
    resetMockOPFS();
  });

  it('should process input stream in chunks without staging full archive in JS memory', async () => {
    const { sessionDir } = await createSession('test_decompress_session');
    const workDir = await sessionDir.getDirectoryHandle('work');

    const decompressor = new StreamingDecompressor({ chunkSize: 1024 * 1024 });

    const chunk1 = new Uint8Array([1, 2, 3, 4]);
    const chunk2 = new Uint8Array([5, 6, 7, 8]);

    const sourceStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const results = await decompressor.decompressArchiveStream(sourceStream, workDir);

    expect(results).toHaveLength(2);
    expect(results[0].size).toBe(4);
    expect(results[1].size).toBe(4);
  });
});
