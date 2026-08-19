/**
 * File Handling API integration module for PWA OS file launches.
 * Enables opening archive files directly via OS "Open With" or double-clicking.
 */

declare global {
  interface Window {
    launchQueue?: {
      setConsumer: (callback: (launchParams: { files: FileSystemFileHandle[] }) => void | Promise<void>) => void;
    };
  }
}

export async function processFileHandles(fileHandles: FileSystemFileHandle[]): Promise<File[]> {
  const files: File[] = [];
  for (const handle of fileHandles) {
    if (handle.kind === 'file') {
      try {
        const file = await handle.getFile();
        files.push(file);
      } catch (err) {
        console.error('Failed to get File from FileSystemFileHandle:', err);
      }
    }
  }
  return files;
}

export function setupFileLaunchHandler(onFilesLaunched: (files: File[]) => void): () => void {
  if (typeof window === 'undefined' || !('launchQueue' in window) || !window.launchQueue) {
    return () => {};
  }

  window.launchQueue.setConsumer(async (launchParams) => {
    if (!launchParams.files || launchParams.files.length === 0) {
      return;
    }
    const files = await processFileHandles(launchParams.files);
    if (files.length > 0) {
      onFilesLaunched(files);
    }
  });

  return () => {
    // Return cleanup function if needed
  };
}
