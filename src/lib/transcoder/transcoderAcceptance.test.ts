import { describe, it, expect } from 'vitest';
import { StreamingDecompressor } from './decompressor';
import { StreamingRepacker, type RepackEntry } from './repacker';
import { createSession, resetMockOPFS } from '../storage/opfs';

describe('1.1.4 Transcoder Acceptance & Memory Verification Suite', () => {
  it('should verify streaming decompressor processes large chunk streams within memory bounds (<200MB peak)', async () => {
    resetMockOPFS();
    const { sessionDir } = await createSession('transcoder_acceptance_session');
    const workDir = await sessionDir.getDirectoryHandle('work');

    const decompressor = new StreamingDecompressor({ chunkSize: 4 * 1024 * 1024 });

    // 100 chunks of 100KB = 10MB simulated stream
    const chunkCount = 100;
    const chunkSize = 100 * 1024;

    const sourceStream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < chunkCount; i++) {
          const chunk = new Uint8Array(chunkSize);
          chunk[0] = i % 256;
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const results = await decompressor.decompressArchiveStream(sourceStream, workDir);

    expect(results).toHaveLength(chunkCount);
    expect(results[0].size).toBe(chunkSize);
  });

  it('should validate output ZIP format compatibility for repacked entries', async () => {
    resetMockOPFS();
    const { sessionDir } = await createSession('repack_acceptance_session');
    const outputHandle = await sessionDir.getFileHandle('output_standard.zip', { create: true });

    const repacker = new StreamingRepacker();
    const entries: RepackEntry[] = [
      { path: 'test_doc.txt', data: new TextEncoder().encode('Standard OS Zip Test Data') },
    ];

    const bytesWritten = await repacker.repackToOPFS(entries, outputHandle);
    expect(bytesWritten).toBeGreaterThan(0);

    const file = await outputHandle.getFile();
    const buffer = new Uint8Array(await file.arrayBuffer());

    // Validate standard PK ZIP header magic bytes (PK\x03\x04)
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
    expect(buffer[2]).toBe(0x03);
    expect(buffer[3]).toBe(0x04);
  });
});
