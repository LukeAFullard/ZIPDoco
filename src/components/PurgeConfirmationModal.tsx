import React, { useState, useEffect, useMemo } from 'react';
import { KeyRound, AlertTriangle, Trash2, X } from 'lucide-react';
import type { EntryLeakReport } from '../lib/security/leakScanner';

export interface PurgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  leakReports: EntryLeakReport[];
  onConfirmPurge: (purgedEntryNames: string[]) => void;
}

export const PurgeConfirmationModal: React.FC<PurgeConfirmationModalProps> = ({
  isOpen,
  onClose,
  leakReports,
  onConfirmPurge,
}) => {
  const flaggedReports = useMemo(() => leakReports.filter(r => r.isFlagged), [leakReports]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedEntries(new Set(flaggedReports.map(r => r.entryName)));
    }
  }, [isOpen, flaggedReports]);

  if (!isOpen) return null;

  const toggleEntry = (entryName: string) => {
    const next = new Set(selectedEntries);
    if (next.has(entryName)) {
      next.delete(entryName);
    } else {
      next.add(entryName);
    }
    setSelectedEntries(next);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === flaggedReports.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(flaggedReports.map(r => r.entryName)));
    }
  };

  const handlePurge = () => {
    onConfirmPurge(Array.from(selectedEntries));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purge-modal-title"
    >
      <div className="bg-white dark:bg-graphite border border-graphite/20 dark:border-white/20 rounded-panel shadow-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] w-full max-w-xl max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-graphite/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-rust/10 text-rust">
              <KeyRound size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="purge-modal-title" className="text-lg font-semibold text-graphite dark:text-stone">
                Review &amp; Purge Flagged Secrets
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {flaggedReports.length} secret or credential exposure{flaggedReports.length === 1 ? '' : 's'} detected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-panel text-gray-500 hover:text-graphite dark:text-gray-400 dark:hover:text-stone hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="p-3 rounded bg-signal/10 border border-signal/30 text-graphite dark:text-stone flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-signal-dim dark:text-signal shrink-0 mt-0.5" />
            <p className="text-gray-700 dark:text-gray-300">
              Purging removes selected sensitive entries from the current session and sanitized repack output. Source files are never modified on disk.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-signal-dim dark:text-signal font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded px-1"
            >
              {selectedEntries.size === flaggedReports.length ? 'Deselect All' : 'Select All Flagged'}
            </button>
            <span className="text-gray-500 dark:text-gray-400 font-mono tabular">
              {selectedEntries.size} / {flaggedReports.length} selected
            </span>
          </div>

          {/* List of Flagged Entries */}
          <div className="space-y-3">
            {flaggedReports.map((report, idx) => {
              const isSelected = selectedEntries.has(report.entryName);
              return (
                <div
                  key={`${report.entryName}-${idx}`}
                  className={`p-3 rounded border transition-colors ${
                    isSelected
                      ? 'bg-rust/5 border-rust/30'
                      : 'bg-stone dark:bg-ink/40 border-graphite/15 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id={`purge-check-${idx}`}
                      checked={isSelected}
                      onChange={() => toggleEntry(report.entryName)}
                      className="mt-1 rounded border-graphite/30 text-rust focus:ring-signal"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`purge-check-${idx}`}
                        className="font-mono font-semibold text-graphite dark:text-stone block truncate cursor-pointer"
                      >
                        {report.entryName}
                      </label>

                      {/* Filename Leaks */}
                      {report.filenameLeaks.map((f, fIdx) => (
                        <div key={fIdx} className="mt-1 flex items-center gap-1.5 text-rust">
                          <span className="px-1.5 py-0.2 rounded bg-rust/15 text-[10px] font-semibold uppercase tracking-wider">
                            {f.severity}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{f.description}</span>
                        </div>
                      ))}

                      {/* Content Secret Findings */}
                      {report.contentSecrets.map((c, cIdx) => (
                        <div key={cIdx} className="mt-1 text-gray-700 dark:text-gray-300 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-signal/20 text-signal-dim dark:text-signal text-[10px] font-semibold uppercase">
                              {c.type}
                            </span>
                            <span>{c.description}</span>
                            {c.line && <span className="text-gray-400 font-mono">Line {c.line}</span>}
                          </div>
                          <p className="font-mono text-rust text-[11px] bg-rust/10 px-1.5 py-0.5 rounded inline-block">
                            Token: {c.matchedToken}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-graphite/10 dark:border-white/10 flex items-center justify-end gap-3 bg-stone/50 dark:bg-graphite">
          <button
            type="button"
            onClick={onClose}
            className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/20 dark:hover:bg-gray-800 text-graphite inline-flex items-center justify-center font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePurge}
            disabled={selectedEntries.size === 0}
            className="bg-rust hover:bg-rust/90 text-white inline-flex items-center gap-1.5 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            <span>Purge Flagged Secrets ({selectedEntries.size})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
