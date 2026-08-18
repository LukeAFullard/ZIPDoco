import { describe, it, expect } from 'vitest';
import {
  isJunkPath,
  filterJunkEntries,
  getJunkStats,
} from './junkFilter';

describe('OS Junk Stripper Module', () => {
  describe('isJunkPath', () => {
    it('identifies macOS __MACOSX directory contents as junk', () => {
      expect(isJunkPath('__MACOSX/file.png')).toBe(true);
      expect(isJunkPath('folder/__MACOSX/._file.png')).toBe(true);
    });

    it('identifies .DS_Store files at root or nested locations as junk', () => {
      expect(isJunkPath('.DS_Store')).toBe(true);
      expect(isJunkPath('photos/subfolder/.DS_Store')).toBe(true);
    });

    it('identifies macOS resource fork AppleDouble files (._) as junk', () => {
      expect(isJunkPath('._image.png')).toBe(true);
      expect(isJunkPath('docs/._manual.pdf')).toBe(true);
    });

    it('identifies macOS system folders (.Spotlight-V100, .Trashes) as junk', () => {
      expect(isJunkPath('.Spotlight-V100/Store-V2')).toBe(true);
      expect(isJunkPath('.Trashes/501/deleted.txt')).toBe(true);
    });

    it('identifies Windows system clutter (Thumbs.db, desktop.ini, ehthumbs.db) as junk', () => {
      expect(isJunkPath('Thumbs.db')).toBe(true);
      expect(isJunkPath('images/Thumbs.db')).toBe(true);
      expect(isJunkPath('desktop.ini')).toBe(true);
      expect(isJunkPath('ehthumbs.db')).toBe(true);
    });

    it('identifies Windows $RECYCLE.BIN and System Volume Information as junk', () => {
      expect(isJunkPath('$RECYCLE.BIN/S-1-5-21/file.exe')).toBe(true);
      expect(isJunkPath('System Volume Information/indexer.dat')).toBe(true);
    });

    it('handles Windows backslash separators in junk paths', () => {
      expect(isJunkPath('folder\\Thumbs.db')).toBe(true);
      expect(isJunkPath('folder\\__MACOSX\\file.png')).toBe(true);
    });

    it('does NOT mark clean, legitimate files as junk', () => {
      expect(isJunkPath('documents/report.pdf')).toBe(false);
      expect(isJunkPath('src/main.tsx')).toBe(false);
      expect(isJunkPath('images/photo.png')).toBe(false);
      expect(isJunkPath('readme.txt')).toBe(false);
    });
  });

  describe('filterJunkEntries', () => {
    const mockEntries = [
      { path: 'docs/report.pdf' },
      { path: 'docs/.DS_Store' },
      { path: '__MACOSX/docs/._report.pdf' },
      { path: 'images/photo.jpg' },
      { path: 'images/Thumbs.db' },
    ];

    it('filters out junk entries when enabled (default)', () => {
      const filtered = filterJunkEntries(mockEntries, (e) => e.path);
      expect(filtered.length).toBe(2);
      expect(filtered.map((e) => e.path)).toEqual(['docs/report.pdf', 'images/photo.jpg']);
    });

    it('preserves all entries when filter is disabled', () => {
      const filtered = filterJunkEntries(mockEntries, (e) => e.path, false);
      expect(filtered.length).toBe(5);
    });
  });

  describe('getJunkStats', () => {
    it('calculates junk vs clean statistics correctly', () => {
      const entries = [
        { path: 'a.txt' },
        { path: 'Thumbs.db' },
        { path: '.DS_Store' },
        { path: 'b.pdf' },
      ];

      const stats = getJunkStats(entries, (e) => e.path);
      expect(stats).toEqual({
        junkCount: 2,
        cleanCount: 2,
        totalCount: 4,
      });
    });
  });
});
