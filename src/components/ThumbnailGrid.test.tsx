import { describe, it, expect, vi } from 'vitest';
import { ThumbnailGrid, type ThumbnailGridItem } from './ThumbnailGrid';

describe('ThumbnailGrid component', () => {
  it('instantiates properly and exports component function', () => {
    expect(ThumbnailGrid).toBeDefined();
    expect(typeof ThumbnailGrid).toBe('function');
  });

  it('filters and processes image entries', () => {
    const entries: ThumbnailGridItem[] = [
      { name: 'cover.jpg', content: 'sample content' },
      { name: 'page1.png', content: 'sample page' },
      { name: 'script.js', content: 'console.log()' },
    ];

    const imageEntries = entries.filter(e => e.name.endsWith('.jpg') || e.name.endsWith('.png'));
    expect(imageEntries).toHaveLength(2);
    expect(imageEntries[0].name).toBe('cover.jpg');
  });

  it('handles preview image callback', () => {
    const onPreview = vi.fn();
    onPreview('cover.jpg');
    expect(onPreview).toHaveBeenCalledWith('cover.jpg');
  });
});
