import React, { useState } from 'react';
import { X, GitCompare, Plus, Minus, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  compareArchives,
  diffLines,
  type ArchiveDiffEntry,
  type ArchiveDiffSummary,
  type DiffResultItem,
} from '../lib/diff/archiveDiff';

interface ArchiveDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryEntries: ArchiveDiffEntry[];
  secondaryEntries?: ArchiveDiffEntry[];
}

export const ArchiveDiffModal: React.FC<ArchiveDiffModalProps> = ({
  isOpen,
  onClose,
  primaryEntries,
  secondaryEntries = [],
}) => {
  const [selectedDiffItem, setSelectedDiffItem] = useState<DiffResultItem | null>(null);

  if (!isOpen) return null;

  const summary: ArchiveDiffSummary = compareArchives(primaryEntries, secondaryEntries);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
    >
      <div className="bg-stone dark:bg-graphite text-graphite dark:text-stone rounded-panel border border-graphite/20 dark:border-white/15 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-graphite/20 dark:border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare size={20} className="text-signal-dim dark:text-signal" />
            <h2 id="diff-modal-title" className="text-lg font-semibold">
              Archive Side-by-Side Diff Comparison
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-graphite dark:hover:text-stone focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-panel p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-verdigris/10 border border-verdigris/30 rounded-panel p-2.5 flex items-center gap-2">
              <Plus size={16} className="text-verdigris shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">ADDED</span>
                <span className="font-bold text-verdigris">{summary.addedCount} files</span>
              </div>
            </div>

            <div className="bg-rust/10 border border-rust/30 rounded-panel p-2.5 flex items-center gap-2">
              <Minus size={16} className="text-rust shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">REMOVED</span>
                <span className="font-bold text-rust">{summary.removedCount} files</span>
              </div>
            </div>

            <div className="bg-signal/10 border border-signal/30 rounded-panel p-2.5 flex items-center gap-2">
              <AlertCircle size={16} className="text-signal-dim dark:text-signal shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">MODIFIED</span>
                <span className="font-bold text-signal-dim dark:text-signal">{summary.modifiedCount} files</span>
              </div>
            </div>

            <div className="bg-gray-200/50 dark:bg-ink/50 border border-graphite/20 dark:border-white/10 rounded-panel p-2.5 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">IDENTICAL</span>
                <span className="font-bold">{summary.identicalCount} files</span>
              </div>
            </div>
          </div>

          {/* Dual Pane View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List of File Diffs */}
            <div className="border border-graphite/20 dark:border-white/15 rounded-panel p-3 space-y-2 bg-stone dark:bg-ink/40 max-h-[320px] overflow-y-auto">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Changed File Tree ({summary.diffs.length})
              </h3>

              {summary.diffs.map((item) => {
                const isSelected = selectedDiffItem?.path === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setSelectedDiffItem(item)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-panel text-xs flex items-center justify-between border transition-colors ${
                      isSelected
                        ? 'border-signal bg-signal/10'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="font-mono truncate mr-2">{item.path}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.status === 'added'
                          ? 'bg-verdigris/20 text-verdigris'
                          : item.status === 'removed'
                            ? 'bg-rust/20 text-rust'
                            : item.status === 'modified'
                              ? 'bg-signal/20 text-signal-dim dark:text-signal'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected File Line-Level Diff Inspector */}
            <div className="border border-graphite/20 dark:border-white/15 rounded-panel p-3 space-y-2 bg-stone dark:bg-ink/40 max-h-[320px] overflow-y-auto font-mono text-xs">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={14} />
                Line Diff Inspector
              </h3>

              {!selectedDiffItem && (
                <p className="text-gray-500 dark:text-gray-400 italic text-[11px] pt-4">
                  Select a modified or changed file from the tree to view two-column line diffs.
                </p>
              )}

              {selectedDiffItem && (
                <div className="space-y-2">
                  <p className="font-bold text-signal-dim dark:text-signal border-b border-graphite/10 dark:border-white/10 pb-1">
                    {selectedDiffItem.path} ({selectedDiffItem.status})
                  </p>

                  {selectedDiffItem.entryA?.content && selectedDiffItem.entryB?.content ? (
                    <div className="space-y-0.5 text-[11px] leading-relaxed">
                      {diffLines(selectedDiffItem.entryA.content, selectedDiffItem.entryB.content).map(
                        (op, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-2 px-1.5 py-0.5 rounded ${
                              op.type === 'added'
                                ? 'bg-verdigris/20 text-verdigris'
                                : op.type === 'removed'
                                  ? 'bg-rust/20 text-rust'
                                  : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="w-8 text-right opacity-50 shrink-0 select-none">
                              {op.lineA ?? ''}
                            </span>
                            <span className="w-8 text-right opacity-50 shrink-0 select-none">
                              {op.lineB ?? ''}
                            </span>
                            <span className="w-4 shrink-0 text-center font-bold">
                              {op.type === 'added' ? '+' : op.type === 'removed' ? '-' : ' '}
                            </span>
                            <span className="whitespace-pre-wrap break-all">{op.text}</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                      Line-level preview unavailable for binary files or entries without extracted text contents.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-graphite/20 dark:border-white/15 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-graphite text-stone dark:bg-stone dark:text-ink hover:bg-ink dark:hover:bg-gray-200 px-4 py-2 rounded-panel font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
