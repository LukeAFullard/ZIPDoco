export const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
export const DEFAULT_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionInfo {
  sessionId: string;
  createdAt: number;
}

// In-memory fallback directory for Node/Vitest testing environments
class MockFileHandle implements Partial<FileSystemFileHandle> {
  kind = 'file' as const;
  name: string;
  private data: Uint8Array = new Uint8Array(0);

  constructor(name: string) {
    this.name = name;
  }

  async getFile(): Promise<File> {
    return new File([this.data.buffer as ArrayBuffer], this.name);
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    let position = 0;

    return {
      write: async (chunk: ArrayBuffer | ArrayBufferView | Blob | string) => {
        let bufferToWrite: Uint8Array;
        if (chunk instanceof Uint8Array) {
          bufferToWrite = chunk;
        } else if (chunk instanceof ArrayBuffer) {
          bufferToWrite = new Uint8Array(chunk);
        } else if (ArrayBuffer.isView(chunk)) {
          bufferToWrite = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        } else if (typeof chunk === 'string') {
          bufferToWrite = new TextEncoder().encode(chunk);
        } else if (chunk instanceof Blob) {
          bufferToWrite = new Uint8Array(await chunk.arrayBuffer());
        } else {
          bufferToWrite = new Uint8Array(0);
        }

        const requiredLen = Math.max(this.data.length, position + bufferToWrite.length);
        const newData = new Uint8Array(requiredLen);
        newData.set(this.data);
        newData.set(bufferToWrite, position);
        this.data = newData;
        position += bufferToWrite.length;
      },
      seek: async (pos: number) => {
        position = pos;
      },
      close: async () => {},
      abort: async () => {},
    } as unknown as FileSystemWritableFileStream;
  }
}

class MockDirectoryHandle implements Partial<FileSystemDirectoryHandle> {
  kind = 'directory' as const;
  name: string;
  private entriesMap = new Map<string, MockDirectoryHandle | MockFileHandle>();

  constructor(name: string) {
    this.name = name;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
    let existing = this.entriesMap.get(name);
    if (!existing) {
      if (options?.create) {
        existing = new MockDirectoryHandle(name);
        this.entriesMap.set(name, existing);
      } else {
        throw new Error(`Directory not found: ${name}`);
      }
    }
    if (existing.kind !== 'directory') {
      throw new Error(`${name} is a file, not a directory`);
    }
    return existing as unknown as FileSystemDirectoryHandle;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
    let existing = this.entriesMap.get(name);
    if (!existing) {
      if (options?.create) {
        existing = new MockFileHandle(name);
        this.entriesMap.set(name, existing);
      } else {
        throw new Error(`File not found: ${name}`);
      }
    }
    if (existing.kind !== 'file') {
      throw new Error(`${name} is a directory, not a file`);
    }
    return existing as unknown as FileSystemFileHandle;
  }

  async removeEntry(name: string, _options?: { recursive?: boolean }): Promise<void> {
    this.entriesMap.delete(name);
  }

  async *entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]> {
    for (const [key, val] of this.entriesMap.entries()) {
      yield [key, val as unknown as FileSystemFileHandle | FileSystemDirectoryHandle];
    }
  }

  async *keys(): AsyncIterableIterator<string> {
    for (const key of this.entriesMap.keys()) {
      yield key;
    }
  }

  async *values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle> {
    for (const val of this.entriesMap.values()) {
      yield val as unknown as FileSystemFileHandle | FileSystemDirectoryHandle;
    }
  }
}

let mockRoot: MockDirectoryHandle | null = null;

export async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
    try {
      return await navigator.storage.getDirectory();
    } catch {
      // Fallback if blocked
    }
  }

  if (!mockRoot) {
    mockRoot = new MockDirectoryHandle('root');
  }
  return mockRoot as unknown as FileSystemDirectoryHandle;
}

/**
 * Resets the mock root directory (for testing).
 */
export function resetMockOPFS(): void {
  mockRoot = null;
}

/**
 * Creates or retrieves the base incoming directory in OPFS.
 */
export async function getIncomingDir(): Promise<FileSystemDirectoryHandle> {
  const root = await getOPFSRoot();
  return await root.getDirectoryHandle('incoming', { create: true });
}

/**
 * Initializes a new storage session directory under /incoming/{sessionId}
 */
export async function createSession(sessionId?: string): Promise<{ sessionId: string; sessionDir: FileSystemDirectoryHandle }> {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const incoming = await getIncomingDir();
  const sessionDir = await incoming.getDirectoryHandle(id, { create: true });

  // Store creation metadata
  const metaHandle = await sessionDir.getFileHandle('.metadata', { create: true });
  const writable = await metaHandle.createWritable();
  const meta: SessionInfo = { sessionId: id, createdAt: Date.now() };
  await writable.write(new TextEncoder().encode(JSON.stringify(meta)));
  await writable.close();

  // Create scratch 'work' directory
  await sessionDir.getDirectoryHandle('work', { create: true });

  return { sessionId: id, sessionDir };
}

/**
 * Gets the directory handle for an existing session.
 */
export async function getSessionDir(sessionId: string): Promise<FileSystemDirectoryHandle> {
  const incoming = await getIncomingDir();
  return await incoming.getDirectoryHandle(sessionId, { create: false });
}

/**
 * Reads a specific chunk (offset, length) from a File or FileHandle without loading full file into memory.
 */
export async function readChunk(
  source: File | FileSystemFileHandle,
  offset: number,
  length: number
): Promise<Uint8Array> {
  let file: File;
  if ('getFile' in source) {
    file = await source.getFile();
  } else {
    file = source;
  }

  const slice = file.slice(offset, offset + length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Writes a chunk to a FileSystemFileHandle at a given offset.
 */
export async function writeChunk(
  fileHandle: FileSystemFileHandle,
  chunk: Uint8Array,
  offset: number
): Promise<void> {
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  if (typeof writable.seek === 'function') {
    await writable.seek(offset);
  }
  await writable.write(chunk.buffer as ArrayBuffer);
  await writable.close();
}

/**
 * Streams data from a ReadableStream<Uint8Array> into an OPFS FileSystemFileHandle in chunks.
 */
export async function streamToFile(
  sourceStream: ReadableStream<Uint8Array>,
  targetFileHandle: FileSystemFileHandle,
  onProgress?: (bytesWritten: number) => void
): Promise<number> {
  const writable = await targetFileHandle.createWritable();
  const reader = sourceStream.getReader();
  let totalWritten = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        await writable.write(value.buffer as ArrayBuffer);
        totalWritten += value.byteLength;
        if (onProgress) {
          onProgress(totalWritten);
        }
      }
    }
  } finally {
    reader.releaseLock();
    await writable.close();
  }

  return totalWritten;
}

/**
 * Streams a FileSystemFileHandle as a ReadableStream<Uint8Array> in 4MB chunks.
 */
export function streamFromFile(
  fileHandle: FileSystemFileHandle,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): ReadableStream<Uint8Array> {
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const file = await fileHandle.getFile();
      if (offset >= file.size) {
        controller.close();
        return;
      }

      const length = Math.min(chunkSize, file.size - offset);
      const chunk = await readChunk(file, offset, length);
      offset += length;
      controller.enqueue(chunk);
    },
  });
}

/**
 * Deletes a session directory and all its scratch files.
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  try {
    const incoming = await getIncomingDir();
    await incoming.removeEntry(sessionId, { recursive: true });
  } catch {
    // Session directory might already be removed
  }
}

/**
 * Purges stale session directories older than maxAgeMs (default 24h).
 */
export async function purgeStaleSessions(
  maxAgeMs: number = DEFAULT_SESSION_MAX_AGE_MS
): Promise<number> {
  let purgedCount = 0;
  const now = Date.now();

  try {
    const incoming = await getIncomingDir();
    for await (const [name, handle] of incoming.entries()) {
      if (handle.kind === 'directory') {
        try {
          const sessionDir = handle as FileSystemDirectoryHandle;
          const metaHandle = await sessionDir.getFileHandle('.metadata');
          const file = await metaHandle.getFile();
          const text = await file.text();
          const meta: SessionInfo = JSON.parse(text);

          if (now - meta.createdAt > maxAgeMs) {
            await incoming.removeEntry(name, { recursive: true });
            purgedCount++;
          }
        } catch {
          // If metadata missing or corrupt, purge if stale
          try {
            await incoming.removeEntry(name, { recursive: true });
            purgedCount++;
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Directory might not exist
  }

  return purgedCount;
}

/**
 * Registers browser event listeners for lifecycle-based session cleanup.
 */
export function setupStorageCleanupHooks(
  getActiveSessionId: () => string | null
): () => void {
  if (typeof window === 'undefined') return () => {};

  const onBeforeUnload = () => {
    const activeId = getActiveSessionId();
    if (activeId) {
      cleanupSession(activeId).catch(() => {});
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      purgeStaleSessions().catch(() => {});
    }
  };

  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibilityChange);

  purgeStaleSessions().catch(() => {});

  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
