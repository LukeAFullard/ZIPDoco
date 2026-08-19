import { readChunk } from '../storage/opfs';

export interface ByteRange {
  start: number;
  end: number;
}

export interface ByteSeekResult {
  data: Uint8Array;
  bytesRead: number;
  totalLength: number;
}

/**
 * Extracts a specific byte range directly from a source File or FileSystemFileHandle for zero-extract Quick Look.
 */
export async function seekAndStreamByteRange(
  source: File | FileSystemFileHandle,
  range: ByteRange
): Promise<ByteSeekResult> {
  const totalLength = 'getFile' in source ? (await source.getFile()).size : source.size;
  const start = Math.max(0, range.start);
  const end = Math.min(totalLength, range.end);
  const length = Math.max(0, end - start);

  const data = await readChunk(source, start, length);

  return {
    data,
    bytesRead: data.byteLength,
    totalLength,
  };
}
