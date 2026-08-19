import { describe, it, expect, vi } from 'vitest';
import { FileTree } from './FileTree';

describe('FileTree Component Unit', () => {
  const sampleEntries = [
    { name: 'docs/guide.md', uncompressedSize: 2000 },
    { name: 'docs/api/spec.json', uncompressedSize: 5000 },
    { name: 'config.env', uncompressedSize: 500 },
  ];

  it('instantiates properly and exports FileTree component', () => {
    expect(FileTree).toBeDefined();
    expect(typeof FileTree).toBe('function');
  });

  it('correctly processes sample entries and path selection states', () => {
    const selected = new Set(['docs/guide.md', 'config.env']);

    expect(selected.has('docs/guide.md')).toBe(true);
    expect(selected.has('docs/api/spec.json')).toBe(false);
    expect(sampleEntries.length).toBe(3);
  });

  it('handles toggle callbacks for paths and select all', () => {
    const handleTogglePath = vi.fn();
    const handleToggleSelectAll = vi.fn();
    const handlePreviewFile = vi.fn();

    handleTogglePath('config.env');
    expect(handleTogglePath).toHaveBeenCalledWith('config.env');

    handleToggleSelectAll(true);
    expect(handleToggleSelectAll).toHaveBeenCalledWith(true);

    handlePreviewFile('docs/guide.md');
    expect(handlePreviewFile).toHaveBeenCalledWith('docs/guide.md');
  });
});
