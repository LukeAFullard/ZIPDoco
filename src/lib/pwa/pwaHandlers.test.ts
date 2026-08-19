import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupFileLaunchHandler, processFileHandles } from './fileHandling';
import { setupShareTargetHandler, setPendingSharedFiles, getPendingSharedFiles } from './shareHandler';

describe('PWA File Handling & Share Target Integration', () => {
  const globalWindow = globalThis as unknown as { window?: Record<string, unknown> };
  let originalWindow: unknown;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalWindow = globalWindow.window;
  });

  afterEach(() => {
    globalWindow.window = originalWindow as Record<string, unknown> | undefined;
  });

  describe('fileHandling', () => {
    it('returns a no-op cleanup function when window.launchQueue is unavailable', () => {
      globalWindow.window = {};
      const callback = vi.fn();
      const cleanup = setupFileLaunchHandler(callback);
      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(callback).not.toHaveBeenCalled();
    });

    it('registers launchQueue consumer when available and processes files', async () => {
      const mockFile = new File(['test content'], 'sample.zip', { type: 'application/zip' });
      const mockGetFile = vi.fn().mockResolvedValue(mockFile);
      const mockHandle = {
        kind: 'file' as const,
        getFile: mockGetFile,
      } as unknown as FileSystemFileHandle;

      let registeredConsumer: ((params: { files: FileSystemFileHandle[] }) => Promise<void>) | null = null;
      globalWindow.window = {
        launchQueue: {
          setConsumer: (cb: (params: { files: FileSystemFileHandle[] }) => Promise<void>) => {
            registeredConsumer = cb;
          },
        },
      };

      const callback = vi.fn();
      setupFileLaunchHandler(callback);

      expect(registeredConsumer).not.toBeNull();
      if (registeredConsumer) {
        await (registeredConsumer as (params: { files: FileSystemFileHandle[] }) => Promise<void>)({ files: [mockHandle] });
      }

      expect(mockGetFile).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith([mockFile]);
    });

    it('processes file handles correctly and skips invalid handles', async () => {
      const mockFile = new File(['data'], 'test.tar', { type: 'application/x-tar' });
      const validHandle = {
        kind: 'file' as const,
        getFile: vi.fn().mockResolvedValue(mockFile),
      } as unknown as FileSystemFileHandle;

      const dirHandle = {
        kind: 'directory' as const,
      } as unknown as FileSystemFileHandle;

      const files = await processFileHandles([validHandle, dirHandle]);
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('test.tar');
    });
  });

  describe('shareHandler', () => {
    it('stores and retrieves pending shared files', () => {
      const testFile = new File(['archive data'], 'shared.7z', { type: 'application/x-7z-compressed' });
      setPendingSharedFiles([testFile]);

      const retrieved = getPendingSharedFiles();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].name).toBe('shared.7z');

      // Second call should return empty array as pending items were consumed
      expect(getPendingSharedFiles()).toHaveLength(0);
    });

    it('notifies registered share target listeners when new pending files are set', () => {
      const listener = vi.fn();
      const cleanup = setupShareTargetHandler(listener);

      const testFile = new File(['data'], 'shared_doc.zip', { type: 'application/zip' });
      setPendingSharedFiles([testFile]);

      expect(listener).toHaveBeenCalledWith([testFile]);

      cleanup();
    });

    it('delivers already pending files immediately upon listener registration', () => {
      const testFile = new File(['data'], 'existing_shared.rar', { type: 'application/x-rar-compressed' });
      setPendingSharedFiles([testFile]);

      const listener = vi.fn();
      const cleanup = setupShareTargetHandler(listener);

      expect(listener).toHaveBeenCalledWith([testFile]);

      cleanup();
    });
  });
});
