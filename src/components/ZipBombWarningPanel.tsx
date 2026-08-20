import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import type { ZipBombCheckResult } from '../lib/security/zipBomb';

export interface ZipBombWarningPanelProps {
  checkResult: ZipBombCheckResult;
  onOverrideSequentialExtraction?: () => void;
  onAbort?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const ZipBombWarningPanel: React.FC<ZipBombWarningPanelProps> = ({
  checkResult,
  onOverrideSequentialExtraction,
  onAbort,
}) => {
  const [isOverridden, setIsOverridden] = useState(false);

  const handleOverride = () => {
    setIsOverridden(true);
    if (onOverrideSequentialExtraction) {
      onOverrideSequentialExtraction();
    }
  };

  const {
    isBombWarning,
    globalRatio,
    maxEntryRatio,
    totalCompressed,
    totalUncompressed,
    nestedArchivesDetected,
    reason,
  } = checkResult;

  if (!isBombWarning) {
    return (
      <div className="bg-white dark:bg-graphite rounded-panel border border-verdigris/30 dark:border-verdigris/40 shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-4 flex items-center gap-3 text-xs text-graphite dark:text-stone">
        <CheckCircle2 size={18} className="text-verdigris shrink-0" />
        <span>
          Pre-flight expansion ratio pass: Global ratio is{' '}
          <span className="font-mono tabular font-semibold">{globalRatio.toFixed(1)}:1</span> (below threshold).
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="bg-white dark:bg-graphite rounded-panel border border-rust/40 dark:border-rust/50 shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-5 space-y-4 text-graphite dark:text-stone transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-full bg-rust/15 text-rust shrink-0 mt-0.5">
          <ShieldAlert size={22} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-semibold text-rust flex items-center gap-2">
              <span>Zip Bomb Safety Intercept</span>
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rust/15 text-rust">
              RATIO: {globalRatio === Infinity ? '∞' : `${globalRatio.toFixed(1)}:1`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {reason || 'The archive expansion ratio exceeds maximum safe thresholds and poses a potential denial-of-service or memory exhaustion risk.'}
          </p>
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-200/50 dark:bg-ink/50 rounded-panel text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400 block font-medium">Compressed Size</span>
          <span className="font-mono tabular text-sm font-semibold">{formatBytes(totalCompressed)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400 block font-medium">Uncompressed Size</span>
          <span className="font-mono tabular text-sm font-semibold">{formatBytes(totalUncompressed)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400 block font-medium">Max Entry Ratio</span>
          <span className="font-mono tabular text-sm font-semibold">
            {maxEntryRatio === Infinity ? '∞' : `${maxEntryRatio.toFixed(1)}:1`}
          </span>
        </div>
      </div>

      {nestedArchivesDetected && (
        <div className="flex items-center gap-2 text-xs text-rust font-medium bg-rust/10 p-2.5 rounded-panel">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Nested archive containers detected within this file (Matryoshka pattern).</span>
        </div>
      )}

      {/* Override / Abort Actions */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-graphite/10 dark:border-white/10">
        {isOverridden ? (
          <div className="flex items-center gap-2 text-xs font-medium text-verdigris bg-verdigris/10 p-2.5 rounded-panel w-full">
            <CheckCircle2 size={16} />
            <span>User override granted. Single-entry sequential extraction fallback activated.</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
              Decompression is paused. You may abort or override to extract entries one-by-one under strict circuit-breaker boundaries.
            </p>

            <div className="flex items-center gap-2 shrink-0">
              {onAbort && (
                <button
                  type="button"
                  onClick={onAbort}
                  className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/20 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1.5 font-medium rounded-panel px-3.5 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
                >
                  <XCircle size={14} />
                  <span>Abort Extraction</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOverride}
                className="bg-rust hover:bg-rust/90 text-white inline-flex items-center gap-1.5 font-medium rounded-panel px-3.5 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ring-offset-white dark:ring-offset-graphite focus-visible:ring-offset-2"
              >
                <AlertTriangle size={14} />
                <span>Override & Sequential Extract</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
