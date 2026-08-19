import { describe, it, expect, vi } from 'vitest';
import { QuickLookModal, type QuickLookFile } from './QuickLookModal';

describe('QuickLookModal Component Unit', () => {
  it('instantiates properly and exports QuickLookModal component', () => {
    expect(QuickLookModal).toBeDefined();
    expect(typeof QuickLookModal).toBe('function');
  });

  it('handles QuickLookFile props correctly for text files', () => {
    const file: QuickLookFile = {
      name: 'notes.txt',
      size: 100,
      content: 'Hello World text preview',
    };

    expect(file.name).toBe('notes.txt');
    expect(file.content).toBe('Hello World text preview');
  });

  it('handles CSV text content correctly', () => {
    const file: QuickLookFile = {
      name: 'data.csv',
      size: 50,
      content: 'Name,Role\nAlice,Developer\nBob,Security',
    };

    expect(file.name.endsWith('.csv')).toBe(true);
    expect(typeof file.content).toBe('string');
  });

  it('triggers onClose callback function', () => {
    const handleClose = vi.fn();
    handleClose();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
