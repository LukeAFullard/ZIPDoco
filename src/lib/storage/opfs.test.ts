import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getSessionDir,
  readChunk,
  writeChunk,
  streamToFile,
  streamFromFile,
  cleanupSession,
  purgeStaleSessions,
  resetMockOPFS,
} from './opfs';

describe('OPFS Working Storage Layer', () => {
  beforeEach(() => {
    resetMockOPFS();
  });

  it('creates session directory structure with metadata and work folder', async () => {
    const { sessionId, sessionDir } = await createSession('test_session_1');
    expect(sessionId).toBe('test_session_1');
    expect(sessionDir).toBeDefined();

    const workDir = await sessionDir.getDirectoryHandle('work');
    expect(workDir).toBeDefined();

    const metaHandle = await sessionDir.getFileHandle('.metadata');
    const metaFile = await metaHandle.getFile();
    const metaText = await metaFile.text();
    const meta = JSON.parse(metaText);

    expect(meta.sessionId).toBe('test_session_1');
    expect(meta.createdAt).toBeGreaterThan(0);
  });

  it('retrieves an existing session directory', async () => {
    await createSession('session_abc');
    const sessionDir = await getSessionDir('session_abc');
    expect(sessionDir).toBeDefined();
  });

  it('writes and reads data chunks correctly', async () => {
    const { sessionDir } = await createSession('session_chunks');
    const fileHandle = await sessionDir.getFileHandle('test.bin', { create: true });

    const chunk1 = new TextEncoder().encode('Hello, ');
    const chunk2 = new TextEncoder().encode('OPFS World!');

    await writeChunk(fileHandle, chunk1, 0);
    await writeChunk(fileHandle, chunk2, chunk1.length);

    const readBytes = await readChunk(fileHandle, 0, chunk1.length + chunk2.length);
    const readText = new TextDecoder().decode(readBytes);

    expect(readText).toBe('Hello, OPFS World!');
  });

  it('streams a ReadableStream into a file and streams back from file', async () => {
    const { sessionDir } = await createSession('session_stream');
    const fileHandle = await sessionDir.getFileHandle('stream_target.dat', { create: true });

    const sourceData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sourceData.slice(0, 5));
        controller.enqueue(sourceData.slice(5));
        controller.close();
      },
    });

    let progressReported = 0;
    const totalWritten = await streamToFile(stream, fileHandle, (bytes) => {
      progressReported = bytes;
    });

    expect(totalWritten).toBe(10);
    expect(progressReported).toBe(10);

    // Stream back
    const readBackStream = streamFromFile(fileHandle, 4);
    const reader = readBackStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    expect(chunks.length).toBe(3); // 4 + 4 + 2 = 10 bytes
    const totalBytes = new Uint8Array(10);
    let offset = 0;
    for (const c of chunks) {
      totalBytes.set(c, offset);
      offset += c.length;
    }

    expect(Array.from(totalBytes)).toEqual(Array.from(sourceData));
  });

  it('cleans up a session directory', async () => {
    await createSession('session_to_delete');

    await cleanupSession('session_to_delete');

    await expect(getSessionDir('session_to_delete')).rejects.toThrow('Directory not found');
  });

  it('purges stale sessions older than max age threshold', async () => {
    // Create an fresh session
    await createSession('fresh_session');

    // Create a stale session with older timestamp
    const { sessionDir: staleDir } = await createSession('stale_session');
    const metaHandle = await staleDir.getFileHandle('.metadata', { create: true });
    const writable = await metaHandle.createWritable();
    const staleMeta = {
      sessionId: 'stale_session',
      createdAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
    };
    await writable.write(new TextEncoder().encode(JSON.stringify(staleMeta)));
    await writable.close();

    const purged = await purgeStaleSessions(24 * 60 * 60 * 1000);
    expect(purged).toBe(1);

    // fresh_session should still exist
    const freshDir = await getSessionDir('fresh_session');
    expect(freshDir).toBeDefined();

    // stale_session should be gone
    await expect(getSessionDir('stale_session')).rejects.toThrow('Directory not found');
  });
});
