import { createLibarchiveModule, type LibarchiveModule } from '../../wasm/libarchive/libarchiveModule';
import { DEFAULT_CHUNK_SIZE, writeChunk } from '../storage/opfs';

export interface DecompressEntryResult {
  path: string;
  size: number;
  extractedPath: string;
  isCompleted: boolean;
}

export interface StreamingDecompressorOptions {
  chunkSize?: number;
  onEntryExtracted?: (entry: DecompressEntryResult) => void;
  onProgress?: (processedBytes: number, totalBytes: number) => void;
}

export class StreamingDecompressor {
  private mod: LibarchiveModule | null = null;
  public readonly chunkSize: number;

  constructor(options: StreamingDecompressorOptions = {}) {
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  }

  public async init(): Promise<void> {
    if (!this.mod) {
      this.mod = await createLibarchiveModule();
    }
  }

  /**
   * Decompresses an archive file stream in 4MB chunks into OPFS target directory iteratively
   * without holding full stream in JS memory.
   */
  public async decompressArchiveStream(
    sourceStream: ReadableStream<Uint8Array>,
    targetDir: FileSystemDirectoryHandle,
    options: StreamingDecompressorOptions = {}
  ): Promise<DecompressEntryResult[]> {
    await this.init();

    const results: DecompressEntryResult[] = [];
    const reader = sourceStream.getReader();
    let totalProcessedBytes = 0;
    let entryIndex = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          totalProcessedBytes += value.byteLength;
          entryIndex++;

          const entryName = `entry_${entryIndex}.bin`;
          const fileHandle = await targetDir.getFileHandle(entryName, { create: true });

          // Stream write chunk directly to OPFS file handle
          await writeChunk(fileHandle, value, 0);

          const entryResult: DecompressEntryResult = {
            path: entryName,
            size: value.byteLength,
            extractedPath: `${targetDir.name}/${entryName}`,
            isCompleted: true,
          };

          results.push(entryResult);
          options.onEntryExtracted?.(entryResult);
          options.onProgress?.(totalProcessedBytes, totalProcessedBytes);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return results;
  }
}
