import { describe, it, expect } from 'vitest';
import {
  consolidateBatchQueue,
  getIsolatedOpfsFolderPath,
  computeSimpleContentHash,
  type BatchArchiveItem,
} from './batchConsolidator';

describe('getIsolatedOpfsFolderPath', () => {
  it('generates collision-safe isolated directory paths', () => {
    const path = getIsolatedOpfsFolderPath('session123', 'archiveA');
    expect(path).toBe('/incoming/session123/batch/archiveA/');
  });
});

describe('computeSimpleContentHash', () => {
  it('computes consistent hashes for identical content', () => {
    const hash1 = computeSimpleContentHash('file.txt', 100, 'hello world');
    const hash2 = computeSimpleContentHash('file.txt', 100, 'hello world');
    expect(hash1).toBe(hash2);
  });
});

describe('consolidateBatchQueue', () => {
  it('deduplicates identical file contents across multiple queued archives', () => {
    const queue: BatchArchiveItem[] = [
      {
        id: 'arch_1',
        name: 'project_v1.zip',
        size: 500,
        entries: [
          { path: 'shared.config', size: 50, hash: 'hash_config_123' },
          { path: 'v1_only.txt', size: 100, hash: 'hash_v1_only' },
        ],
      },
      {
        id: 'arch_2',
        name: 'project_v2.zip',
        size: 600,
        entries: [
          { path: 'shared.config', size: 50, hash: 'hash_config_123' }, // Duplicate content!
          { path: 'v2_only.txt', size: 150, hash: 'hash_v2_only' },
        ],
      },
    ];

    const report = consolidateBatchQueue(queue);

    expect(report.totalInputArchives).toBe(2);
    expect(report.totalInputEntries).toBe(4);
    expect(report.uniqueEntriesCount).toBe(3);
    expect(report.duplicateEntriesCount).toBe(1);

    const configEntry = report.deduplicatedEntries.find((e) => e.hash === 'hash_config_123');
    expect(configEntry).toBeDefined();
    expect(configEntry?.sourceArchiveIds).toEqual(['arch_1', 'arch_2']);
  });
});
