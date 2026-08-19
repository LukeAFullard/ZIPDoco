import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, ShieldCheck, FileArchive, BookOpen, FileText } from 'lucide-react';

export interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onScanSample: () => void;
  onTriggerBombSample: () => void;
  onScanComicSample?: () => void;
  onScanPdfSample?: () => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  onScanSample,
  onTriggerBombSample,
  onScanComicSample,
  onScanPdfSample,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
    }
  };

  const handleOpenFilePicker = async () => {
    if ('showOpenFilePicker' in window && typeof window.showOpenFilePicker === 'function') {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Archive Files',
              accept: {
                'application/zip': ['.zip', '.cbz'],
                'application/x-rar-compressed': ['.rar', '.cbr'],
                'application/x-7z-compressed': ['.7z', '.cb7'],
                'application/x-tar': ['.tar', '.tar.gz', '.tgz', '.cbt'],
              },
            },
          ],
        });
        const files: File[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          files.push(file);
        }
        if (files.length > 0) {
          onFilesSelected(files);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-panel border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
        isDragActive
          ? 'border-signal bg-signal/10 dark:bg-signal/15 scale-[1.01]'
          : 'border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite hover:border-graphite/40 dark:hover:border-white/30'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileInputChange}
        accept=".zip,.rar,.7z,.tar,.gz,.bz2,.xz,.cbz,.cbr,.cb7,.cbt"
        multiple
        tabIndex={-1}
      />

      <div className="space-y-4 max-w-lg mx-auto">
        <div className="inline-flex p-3.5 rounded-full bg-signal/15 text-signal-dim dark:text-signal">
          {isDragActive ? <FileArchive size={32} className="animate-bounce" /> : <Upload size={32} />}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-graphite dark:text-stone">
            {isDragActive ? 'Drop Archives Here for Intake' : 'Safe Archive Intake & Inspection'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Drag and drop untrusted archives (ZIP, RAR, 7z, TAR, CBR, CBZ) or select files to inspect in 100% offline Wasm sandbox.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleOpenFilePicker}
            className="bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center justify-center font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 px-3.5 py-1.5 text-xs shadow-sm"
          >
            Select Archives
          </button>

          <button
            type="button"
            onClick={onScanSample}
            className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
          >
            <RefreshCw size={13} />
            <span>Sample Security Scan</span>
          </button>

          {onScanComicSample && (
            <button
              type="button"
              onClick={onScanComicSample}
              className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
            >
              <BookOpen size={13} className="text-signal-dim dark:text-signal" />
              <span>Comic (CBZ/CBR) Sample</span>
            </button>
          )}

          {onScanPdfSample && (
            <button
              type="button"
              onClick={onScanPdfSample}
              className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
            >
              <FileText size={13} className="text-signal-dim dark:text-signal" />
              <span>PDF Document Sample</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTriggerBombSample}
            className="bg-stone border border-rust/30 hover:bg-rust/10 dark:bg-graphite dark:border-rust/40 text-rust inline-flex items-center gap-1 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
          >
            <ShieldCheck size={13} />
            <span>Simulate Zip Bomb</span>
          </button>
        </div>
      </div>
    </div>
  );
};
