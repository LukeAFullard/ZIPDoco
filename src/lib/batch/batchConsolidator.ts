export interface BatchEntryItem {
  path: string;
  size: number;
  hash?: string;
  content?: Uint8Array | string;
}

export interface BatchArchiveItem {
  id: string;
  name: string;
  size: number;
  entries: BatchEntryItem[];
}

export interface DeduplicatedEntry {
  canonicalPath: string;
  hash: string;
  size: number;
  sourceArchiveIds: string[];
  sourcePaths: string[];
}

export interface BatchConsolidationReport {
  totalInputArchives: number;
  totalInputEntries: number;
  uniqueEntriesCount: number;
  duplicateEntriesCount: number;
  deduplicatedEntries: DeduplicatedEntry[];
}

/**
 * Computes a simple fast string hash representation if cryptographic SHA-256 is not pre-computed
 */
export function computeSimpleContentHash(
  path: string,
  size: number,
  content?: Uint8Array | string
): string {
  if (typeof content === 'string') {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return `str_${size}_${hash}`;
  }

  if (content instanceof Uint8Array) {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1024); i++) {
      hash = (hash << 5) - hash + content[i];
      hash |= 0;
    }
    return `bin_${size}_${hash}`;
  }

  return `meta_${path}_${size}`;
}

/**
 * Consolidates multiple queued archives into a deduplicated set of unique file entries ("Merge All")
 */
export function consolidateBatchQueue(
  queue: BatchArchiveItem[]
): BatchConsolidationReport {
  let totalInputEntries = 0;
  const hashToEntryMap = new Map<string, DeduplicatedEntry>();

  queue.forEach((archive) => {
    totalInputEntries += archive.entries.length;

    archive.entries.forEach((entry) => {
      const entryHash =
        entry.hash ?? computeSimpleContentHash(entry.path, entry.size, entry.content);

      const existing = hashToEntryMap.get(entryHash);

      if (existing) {
        if (!existing.sourceArchiveIds.includes(archive.id)) {
          existing.sourceArchiveIds.push(archive.id);
        }
        existing.sourcePaths.push(`${archive.name}:${entry.path}`);
      } else {
        hashToEntryMap.set(entryHash, {
          canonicalPath: entry.path,
          hash: entryHash,
          size: entry.size,
          sourceArchiveIds: [archive.id],
          sourcePaths: [`${archive.name}:${entry.path}`],
        });
      }
    });
  });

  const deduplicatedEntries = Array.from(hashToEntryMap.values());
  const uniqueEntriesCount = deduplicatedEntries.length;
  const duplicateEntriesCount = totalInputEntries - uniqueEntriesCount;

  return {
    totalInputArchives: queue.length,
    totalInputEntries,
    uniqueEntriesCount,
    duplicateEntriesCount,
    deduplicatedEntries,
  };
}

/**
 * Returns isolated, collision-safe OPFS folder paths for multi-archive batch extractions
 */
export function getIsolatedOpfsFolderPath(
  sessionId: string,
  archiveId: string
): string {
  const cleanSession = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanArchive = archiveId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `/incoming/${cleanSession}/batch/${cleanArchive}/`;
}
