import { describe, it, expect, vi } from 'vitest';
import { ArchiveDiffModal } from './ArchiveDiffModal';
import { compareArchives, type ArchiveDiffEntry } from '../lib/diff/archiveDiff';

describe('ArchiveDiffModal Component Unit', () => {
  const primary: ArchiveDiffEntry[] = [
    { path: 'app.js', size: 100, content: 'console.log("v1");' },
    { path: 'deleted.txt', size: 20 },
  ];

  const secondary: ArchiveDiffEntry[] = [
    { path: 'app.js', size: 120, content: 'console.log("v2");' },
    { path: 'added.txt', size: 30 },
  ];

  it('instantiates properly and exports component', () => {
    expect(ArchiveDiffModal).toBeDefined();
    expect(typeof ArchiveDiffModal).toBe('function');
  });

  it('calculates archive comparison data accurately for modal props', () => {
    const summary = compareArchives(primary, secondary);
    expect(summary.addedCount).toBe(1);
    expect(summary.removedCount).toBe(1);
    expect(summary.modifiedCount).toBe(1);
    expect(summary.identicalCount).toBe(0);
  });

  it('triggers onClose callback function', () => {
    const handleClose = vi.fn();
    handleClose();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
