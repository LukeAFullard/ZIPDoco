import { describe, it, expect } from 'vitest';
import { detectMultiVolume, aggregateVolumeSet } from './volumeDetector';

describe('volumeDetector Module', () => {
  describe('detectMultiVolume', () => {
    it('detects modern RAR part conventions', () => {
      const part1 = detectMultiVolume('backup.part01.rar');
      expect(part1).toEqual({
        baseName: 'backup',
        format: 'rar',
        volumeIndex: 1,
        partPattern: '.part{N}.rar',
      });

      const part2 = detectMultiVolume('my_archive.part2.rar');
      expect(part2).toEqual({
        baseName: 'my_archive',
        format: 'rar',
        volumeIndex: 2,
        partPattern: '.part{N}.rar',
      });
    });

    it('detects legacy RAR .r00 conventions', () => {
      const legacyR00 = detectMultiVolume('data.r00');
      expect(legacyR00).toEqual({
        baseName: 'data',
        format: 'rar',
        volumeIndex: 2,
        partPattern: '.r{NN}',
      });
    });

    it('detects 7z split volumes', () => {
      const split7z = detectMultiVolume('large_dataset.7z.001');
      expect(split7z).toEqual({
        baseName: 'large_dataset',
        format: '7z',
        volumeIndex: 1,
        partPattern: '.7z.{NNN}',
      });
    });

    it('detects ZIP split volumes', () => {
      const zipSplit = detectMultiVolume('photos.z01');
      expect(zipSplit).toEqual({
        baseName: 'photos',
        format: 'zip',
        volumeIndex: 1,
        partPattern: '.z{NN}',
      });
    });

    it('returns null for single non-volume files', () => {
      expect(detectMultiVolume('document.pdf')).toBeNull();
      expect(detectMultiVolume('archive.zip')).toBeNull();
      expect(detectMultiVolume('archive.rar')).toBeNull();
    });
  });

  describe('aggregateVolumeSet', () => {
    it('reports complete volume set when all parts exist', () => {
      const files = [
        { name: 'backup.part01.rar', size: 1000 },
        { name: 'backup.part02.rar', size: 1000 },
        { name: 'backup.part03.rar', size: 500 },
      ];

      const report = aggregateVolumeSet(files);
      expect(report.isMultiVolumeSet).toBe(true);
      expect(report.isComplete).toBe(true);
      expect(report.missingVolumeIndexes).toEqual([]);
      expect(report.detectedVolumes).toHaveLength(3);
      expect(report.format).toBe('rar');
    });

    it('identifies missing parts in an incomplete volume set', () => {
      const files = [
        { name: 'dataset.7z.001', size: 5000 },
        { name: 'dataset.7z.003', size: 2000 },
      ];

      const report = aggregateVolumeSet(files);
      expect(report.isMultiVolumeSet).toBe(true);
      expect(report.isComplete).toBe(false);
      expect(report.missingVolumeIndexes).toEqual([2]);
      expect(report.promptMessage).toContain('Missing volume parts: Part 2');
    });

    it('handles non-multivolume file inputs gracefully', () => {
      const files = [{ name: 'single.zip', size: 100 }];
      const report = aggregateVolumeSet(files);
      expect(report.isMultiVolumeSet).toBe(false);
      expect(report.isComplete).toBe(true);
    });
  });
});
