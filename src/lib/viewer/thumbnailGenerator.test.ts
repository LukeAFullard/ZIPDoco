import { describe, it, expect } from 'vitest';
import {
  isImageFile,
  isImageHeavyArchive,
  getFileExtension,
  generateThumbnail,
} from './thumbnailGenerator';

describe('thumbnailGenerator', () => {
  it('identifies image file extensions correctly', () => {
    expect(isImageFile('cover.jpg')).toBe(true);
    expect(isImageFile('page1.PNG')).toBe(true);
    expect(isImageFile('diagram.webp')).toBe(true);
    expect(isImageFile('photo.AVIF')).toBe(true);
    expect(isImageFile('document.pdf')).toBe(false);
    expect(isImageFile('script.js')).toBe(false);
  });

  it('extracts file extensions accurately', () => {
    expect(getFileExtension('archive.zip')).toBe('zip');
    expect(getFileExtension('comic.cbr')).toBe('cbr');
    expect(getFileExtension('noextension')).toBe('');
  });

  it('detects image-heavy archives (>50% images)', () => {
    const heavyEntries = [
      { name: 'cover.jpg' },
      { name: 'page1.png' },
      { name: 'page2.png' },
      { name: 'readme.txt' },
    ];
    expect(isImageHeavyArchive(heavyEntries)).toBe(true);

    const nonHeavyEntries = [
      { name: 'code.ts' },
      { name: 'index.html' },
      { name: 'logo.png' },
      { name: 'styles.css' },
    ];
    expect(isImageHeavyArchive(nonHeavyEntries)).toBe(false);
  });

  it('returns thumbnail string fallback in test env', async () => {
    const thumb = await generateThumbnail('https://example.com/image.jpg');
    expect(typeof thumb).toBe('string');
  });
});
