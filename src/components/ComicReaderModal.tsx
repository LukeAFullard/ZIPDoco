import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  List,
} from 'lucide-react';
import {
  parseComicInfo,
  getComicPageSrc,
  type ComicArchiveEntry,
  type ComicPage,
} from '../lib/viewer/comicReader';

interface ComicReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  archiveName: string;
  entries: ComicArchiveEntry[];
}

export const ComicReaderModal: React.FC<ComicReaderModalProps> = ({
  isOpen,
  onClose,
  archiveName,
  entries,
}) => {
  const comicInfo = parseComicInfo(archiveName, entries);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showPageDrawer, setShowPageDrawer] = useState(false);

  const totalPages = comicInfo.totalPages;
  const currentPage: ComicPage | undefined = comicInfo.pages[currentPageIndex];

  // Reset state when modal opens or archive changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPageIndex(0);
      setZoomLevel(100);
      setShowPageDrawer(false);
    }
  }, [isOpen, archiveName]);

  const handleNextPage = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  }, [currentPageIndex, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  }, [currentPageIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextPage, handlePrevPage, onClose]);

  if (!isOpen) return null;

  const pageSrc = currentPage ? getComicPageSrc(currentPage) : '';

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/20 shadow-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comic-reader-title"
      >
        {/* Header toolbar */}
        <header className="p-3 border-b border-graphite/20 dark:border-white/20 flex flex-wrap items-center justify-between gap-2 bg-stone dark:bg-graphite shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={18} className="text-signal-dim dark:text-signal shrink-0" />
            <div className="truncate">
              <h2 id="comic-reader-title" className="text-sm font-semibold truncate text-graphite dark:text-stone">
                {comicInfo.title}
              </h2>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                {comicInfo.format.toUpperCase()} • Page {totalPages > 0 ? currentPageIndex + 1 : 0} of {totalPages}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Page Jump Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowPageDrawer(prev => !prev)}
              aria-label="Toggle Page List"
              title="Toggle Page List"
              className="p-1.5 rounded-panel text-graphite dark:text-stone hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <List size={18} />
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-stone dark:bg-ink rounded-panel border border-graphite/20 dark:border-white/20 p-0.5">
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
                aria-label="Zoom Out"
                title="Zoom Out"
                className="p-1 text-graphite dark:text-stone hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-gray-600 dark:text-gray-300">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(z => Math.min(200, z + 25))}
                aria-label="Zoom In"
                title="Zoom In"
                className="p-1 text-graphite dark:text-stone hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                aria-label="Reset Zoom"
                title="Reset Zoom"
                className="p-1 text-graphite dark:text-stone hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none border-l border-graphite/10 dark:border-white/10"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-1.5 rounded-panel text-gray-500 hover:text-graphite dark:text-gray-400 dark:hover:text-stone hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative bg-gray-900/90 dark:bg-ink">
          {/* Page Drawer Side Panel */}
          {showPageDrawer && (
            <aside className="w-64 bg-stone dark:bg-graphite border-r border-graphite/20 dark:border-white/20 p-3 overflow-y-auto space-y-2 z-10 shrink-0 text-xs">
              <h3 className="font-semibold text-graphite dark:text-stone mb-2">Pages ({totalPages})</h3>
              <div className="space-y-1">
                {comicInfo.pages.map((p, idx) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setCurrentPageIndex(idx);
                      setShowPageDrawer(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-panel text-[11px] font-mono truncate transition-colors ${
                      idx === currentPageIndex
                        ? 'bg-graphite text-stone dark:bg-stone dark:text-graphite font-medium'
                        : 'hover:bg-gray-200/60 dark:hover:bg-gray-800 text-graphite dark:text-stone'
                    }`}
                  >
                    {p.pageNumber}. {p.name.split('/').pop()}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Reader Page Viewing Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {currentPage ? (
              <img
                src={pageSrc}
                alt={`Comic Page ${currentPage.pageNumber}`}
                style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel === 100 ? '100%' : 'none' }}
                className="object-contain shadow-lg rounded transition-all duration-150"
              />
            ) : (
              <div className="text-stone text-xs font-mono">No pages found in comic archive.</div>
            )}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <footer className="p-3 border-t border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPageIndex(0)}
              disabled={currentPageIndex === 0}
              aria-label="First Page"
              title="First Page"
              className="p-1.5 rounded-panel border border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite text-graphite dark:text-stone disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              aria-label="Previous Page"
              title="Previous Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-panel border border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite text-graphite dark:text-stone disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>
          </div>

          <div className="text-xs font-mono text-graphite dark:text-stone flex items-center gap-2">
            <span>
              Page {totalPages > 0 ? currentPageIndex + 1 : 0} / {totalPages}
            </span>
            <select
              value={currentPageIndex}
              onChange={e => setCurrentPageIndex(Number(e.target.value))}
              aria-label="Select Page"
              className="bg-white dark:bg-graphite text-graphite dark:text-stone text-xs font-mono border border-graphite/20 dark:border-white/20 rounded px-1.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              {comicInfo.pages.map((p, idx) => (
                <option key={p.name} value={idx}>
                  Page {p.pageNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              aria-label="Next Page"
              title="Next Page"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-panel border border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite text-graphite dark:text-stone disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPageIndex(totalPages - 1)}
              disabled={currentPageIndex >= totalPages - 1}
              aria-label="Last Page"
              title="Last Page"
              className="p-1.5 rounded-panel border border-graphite/20 dark:border-white/20 bg-stone dark:bg-graphite text-graphite dark:text-stone disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
