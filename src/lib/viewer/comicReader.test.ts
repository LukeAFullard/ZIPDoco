import { describe, it, expect } from 'vitest';
import {
  isComicArchive,
  extractComicPages,
  parseComicInfo,
  getComicPageSrc,
} from './comicReader';

describe('comicReader', () => {
  it('detects comic archives by file extension', () => {
    expect(isComicArchive('SpiderMan_001.cbz', [])).toBe(true);
    expect(isComicArchive('Batman_001.cbr', [])).toBe(true);
    expect(isComicArchive('Comic.cb7', [])).toBe(true);
  });

  it('detects comic archives by entry content ratio (>50% images)', () => {
    const entries = [
      { name: '01.jpg' },
      { name: '02.jpg' },
      { name: '03.jpg' },
      { name: 'notes.txt' },
    ];
    expect(isComicArchive('archive.zip', entries)).toBe(true);
  });

  it('sorts pages naturally by filename', () => {
    const entries = [
      { name: 'page_10.jpg' },
      { name: 'page_1.jpg' },
      { name: 'page_2.jpg' },
      { name: 'cover.jpg' },
    ];
    const pages = extractComicPages(entries);
    expect(pages.map(p => p.name)).toEqual([
      'cover.jpg',
      'page_1.jpg',
      'page_2.jpg',
      'page_10.jpg',
    ]);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[3].pageNumber).toBe(4);
  });

  it('parses comic archive metadata accurately', () => {
    const info = parseComicInfo('X-Men_001.cbz', [
      { name: 'page1.png' },
      { name: 'page2.png' },
    ]);
    expect(info.isComic).toBe(true);
    expect(info.format).toBe('cbz');
    expect(info.title).toBe('X-Men_001');
    expect(info.totalPages).toBe(2);
  });

  it('generates displayable image source URL for comic pages', () => {
    const page = { pageNumber: 1, name: 'page1.jpg' };
    const src = getComicPageSrc(page);
    expect(src).toContain('svg');
  });
});
