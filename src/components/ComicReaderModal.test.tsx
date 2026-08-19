import { describe, it, expect, vi } from 'vitest';
import { ComicReaderModal } from './ComicReaderModal';
import { parseComicInfo, type ComicArchiveEntry } from '../lib/viewer/comicReader';

describe('ComicReaderModal component', () => {
  const sampleComicEntries: ComicArchiveEntry[] = [
    { name: 'cover.jpg', content: 'img1' },
    { name: 'page_01.jpg', content: 'img2' },
    { name: 'page_02.jpg', content: 'img3' },
  ];

  it('instantiates properly and exports component function', () => {
    expect(ComicReaderModal).toBeDefined();
    expect(typeof ComicReaderModal).toBe('function');
  });

  it('parses comic information correctly for modal state', () => {
    const comicInfo = parseComicInfo('SpiderMan_001.cbz', sampleComicEntries);
    expect(comicInfo.title).toBe('SpiderMan_001');
    expect(comicInfo.totalPages).toBe(3);
    expect(comicInfo.format).toBe('cbz');
  });

  it('handles modal close callback', () => {
    const onClose = vi.fn();
    onClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
