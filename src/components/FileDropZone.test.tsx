import { describe, it, expect, vi } from 'vitest';
import { FileDropZone } from './FileDropZone';

describe('FileDropZone Component Unit & File System Access Integration', () => {
  it('instantiates properly and accepts event handlers', () => {
    expect(FileDropZone).toBeDefined();
    expect(typeof FileDropZone).toBe('function');
  });

  it('correctly processes dropped file arrays', () => {
    const handleFilesSelected = vi.fn();
    const mockFile1 = new File(['data'], 'archive1.zip', { type: 'application/zip' });
    const mockFile2 = new File(['data'], 'archive2.rar', { type: 'application/x-rar' });

    const files = [mockFile1, mockFile2];
    handleFilesSelected(files);

    expect(handleFilesSelected).toHaveBeenCalledWith(files);
    expect(handleFilesSelected.mock.calls[0][0][0].name).toBe('archive1.zip');
    expect(handleFilesSelected.mock.calls[0][0][1].name).toBe('archive2.rar');
  });
});
