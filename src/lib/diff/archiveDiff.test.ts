import { describe, it, expect } from 'vitest';
import {
  compareArchives,
  diffLines,
  normalizeDiffPath,
  type ArchiveDiffEntry,
} from './archiveDiff';

describe('normalizeDiffPath', () => {
  it('normalizes backslashes and leading slashes', () => {
    expect(normalizeDiffPath('folder\\file.txt')).toBe('folder/file.txt');
    expect(normalizeDiffPath('./folder/file.txt')).toBe('folder/file.txt');
    expect(normalizeDiffPath('/folder/file.txt')).toBe('folder/file.txt');
  });
});

describe('compareArchives', () => {
  it('correctly categorizes added, removed, modified, and identical entries', () => {
    const archiveA: ArchiveDiffEntry[] = [
      { path: 'unchanged.txt', size: 100, content: 'same content' },
      { path: 'modified.txt', size: 200, content: 'version 1' },
      { path: 'deleted.txt', size: 50, content: 'going away' },
    ];

    const archiveB: ArchiveDiffEntry[] = [
      { path: 'unchanged.txt', size: 100, content: 'same content' },
      { path: 'modified.txt', size: 250, content: 'version 2' },
      { path: 'created.txt', size: 300, content: 'brand new' },
    ];

    const summary = compareArchives(archiveA, archiveB);

    expect(summary.totalA).toBe(3);
    expect(summary.totalB).toBe(3);
    expect(summary.addedCount).toBe(1);
    expect(summary.removedCount).toBe(1);
    expect(summary.modifiedCount).toBe(1);
    expect(summary.identicalCount).toBe(1);

    const createdDiff = summary.diffs.find((d) => d.path === 'created.txt');
    expect(createdDiff?.status).toBe('added');
    expect(createdDiff?.sizeDelta).toBe(300);

    const deletedDiff = summary.diffs.find((d) => d.path === 'deleted.txt');
    expect(deletedDiff?.status).toBe('removed');
    expect(deletedDiff?.sizeDelta).toBe(-50);

    const modifiedDiff = summary.diffs.find((d) => d.path === 'modified.txt');
    expect(modifiedDiff?.status).toBe('modified');
    expect(modifiedDiff?.sizeDelta).toBe(50);

    const identicalDiff = summary.diffs.find((d) => d.path === 'unchanged.txt');
    expect(identicalDiff?.status).toBe('identical');
    expect(identicalDiff?.sizeDelta).toBe(0);
  });

  it('uses SHA-256 hash or size when content is absent', () => {
    const archiveA: ArchiveDiffEntry[] = [
      { path: 'hashMatch.txt', hash: 'abc123' },
      { path: 'hashDiff.txt', hash: 'abc123' },
    ];

    const archiveB: ArchiveDiffEntry[] = [
      { path: 'hashMatch.txt', hash: 'abc123' },
      { path: 'hashDiff.txt', hash: 'xyz987' },
    ];

    const summary = compareArchives(archiveA, archiveB);
    expect(summary.modifiedCount).toBe(1);
    expect(summary.identicalCount).toBe(1);
  });
});

describe('diffLines', () => {
  it('computes correct line diff ops for additions and removals', () => {
    const textA = 'line 1\nline 2\nline 3';
    const textB = 'line 1\nline 2 modified\nline 3\nline 4';

    const ops = diffLines(textA, textB);

    expect(ops.some((o) => o.type === 'unchanged' && o.text === 'line 1')).toBe(true);
    expect(ops.some((o) => o.type === 'removed' && o.text === 'line 2')).toBe(true);
    expect(ops.some((o) => o.type === 'added' && o.text === 'line 2 modified')).toBe(true);
    expect(ops.some((o) => o.type === 'added' && o.text === 'line 4')).toBe(true);
  });
});
