/**
 * Web Share Target API payload handler.
 * Manages shared files passed to the PWA via share target target payloads.
 */

let pendingSharedFiles: File[] = [];
const listeners: Set<(files: File[]) => void> = new Set();

export function setPendingSharedFiles(files: File[]): void {
  pendingSharedFiles = files;
  if (files.length > 0) {
    listeners.forEach((listener) => listener(files));
  }
}

export function getPendingSharedFiles(): File[] {
  const files = [...pendingSharedFiles];
  pendingSharedFiles = [];
  return files;
}

export function setupShareTargetHandler(onShareReceived: (files: File[]) => void): () => void {
  listeners.add(onShareReceived);

  // Deliver any files already pending before listener was registered
  if (pendingSharedFiles.length > 0) {
    const files = getPendingSharedFiles();
    onShareReceived(files);
  }

  // Also check if files were passed via URL params or window state if needed
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SHARE_TARGET_FILES' && Array.isArray(event.data.files)) {
        onShareReceived(event.data.files as File[]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      listeners.delete(onShareReceived);
      window.removeEventListener('message', handleMessage);
    };
  }

  return () => {
    listeners.delete(onShareReceived);
  };
}
