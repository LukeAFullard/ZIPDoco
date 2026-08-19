import { useState, useEffect } from 'react';
import { Languages, X, Check, ArrowRight } from 'lucide-react';
import type { MojibakeDetectionResult } from '../lib/security/mojibake';

export interface MangledEntryItem {
  name: string;
  mojibake: MojibakeDetectionResult;
}

interface MojibakeRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  mangledEntries: MangledEntryItem[];
  onApplyRepairs: (repairsMap: Record<string, string>) => void;
}

export function MojibakeRepairModal({
  isOpen,
  onClose,
  mangledEntries,
  onApplyRepairs,
}: MojibakeRepairModalProps) {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedNames(new Set(mangledEntries.map(e => e.name)));
    }
  }, [isOpen, mangledEntries]);

  if (!isOpen) return null;

  const toggleSelect = (name: string) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedNames.size === mangledEntries.length) {
      setSelectedNames(new Set());
    } else {
      setSelectedNames(new Set(mangledEntries.map(e => e.name)));
    }
  };

  const handleApply = () => {
    const repairsMap: Record<string, string> = {};
    for (const item of mangledEntries) {
      if (selectedNames.has(item.name)) {
        repairsMap[item.name] = item.mojibake.repaired;
      }
    }
    onApplyRepairs(repairsMap);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mojibake-modal-title"
    >
      <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-graphite/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-panel bg-signal/15 text-signal-dim dark:text-signal">
              <Languages size={20} />
            </div>
            <div>
              <h2 id="mojibake-modal-title" className="text-base font-semibold text-graphite dark:text-stone">
                Mojibake Filename Repair
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Normalize detected non-UTF-8 character encodings into clean UTF-8 strings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-panel text-gray-500 hover:text-graphite dark:hover:text-stone hover:bg-gray-200/50 dark:hover:bg-ink/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Diff Table List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-1">
            <span>
              Detected {mangledEntries.length} filename(s) with character encoding anomalies
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-signal-dim dark:text-signal font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded px-1"
            >
              {selectedNames.size === mangledEntries.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-2.5">
            {mangledEntries.map((item, idx) => {
              const isChecked = selectedNames.has(item.name);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(item.name)}
                  className={`p-3 rounded-panel border text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                    isChecked
                      ? 'bg-stone/80 dark:bg-ink/80 border-signal/50'
                      : 'bg-stone/40 dark:bg-ink/30 border-graphite/10 dark:border-white/10 opacity-70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(item.name)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 rounded border-graphite/30 text-signal focus:ring-signal"
                    aria-label={`Repair ${item.name}`}
                  />

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={item.name}>
                        {item.name}
                      </span>
                      <ArrowRight size={14} className="text-signal-dim dark:text-signal shrink-0" />
                      <span className="font-mono font-medium text-verdigris truncate max-w-[200px]" title={item.mojibake.repaired}>
                        {item.mojibake.repaired}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>Encoding: <strong className="font-medium text-graphite dark:text-stone">{item.mojibake.detectedEncoding}</strong></span>
                      <span>Confidence: <strong className="font-mono">{Math.round(item.mojibake.confidence * 100)}%</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-graphite/10 dark:border-white/10 flex items-center justify-between gap-3 bg-stone/50 dark:bg-ink/30">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {selectedNames.size} of {mangledEntries.length} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-panel bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedNames.size === 0}
              className="px-4 py-2 text-xs font-medium rounded-panel bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span>Apply {selectedNames.size} Repair(s)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
