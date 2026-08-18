import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, FileCode, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type { EntrySecurityReport } from '../lib/security/spooferShield';

export interface SafetySummaryPanelProps {
  reports: EntrySecurityReport[];
  zipBombWarning?: string;
  onDismissWarning?: () => void;
}

export const SafetySummaryPanel: React.FC<SafetySummaryPanelProps> = ({ reports, zipBombWarning }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const dangerReports = reports.filter(r => r.riskLevel === 'danger');
  const warningReports = reports.filter(r => r.riskLevel === 'warning');
  const safeCount = reports.filter(r => r.riskLevel === 'safe').length;
  const totalReports = reports.length;

  const totalFlagged = dangerReports.length + warningReports.length + (zipBombWarning ? 1 : 0);
  const overallStatus = dangerReports.length > 0 || zipBombWarning
    ? 'danger'
    : warningReports.length > 0
    ? 'warning'
    : 'safe';

  return (
    <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-sm p-5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {overallStatus === 'safe' && (
            <div className="p-2 rounded-full bg-verdigris/10 text-verdigris">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
          )}
          {overallStatus === 'warning' && (
            <div className="p-2 rounded-full bg-signal/15 text-signal-dim dark:text-signal">
              <AlertTriangle size={22} aria-hidden="true" />
            </div>
          )}
          {overallStatus === 'danger' && (
            <div className="p-2 rounded-full bg-rust/10 text-rust">
              <ShieldAlert size={22} aria-hidden="true" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-graphite dark:text-stone">
                Safety Inspection
              </h3>
              <div className="relative inline-block">
                <button
                  type="button"
                  aria-label="Safety inspection help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  className="text-graphite/40 dark:text-stone/40 hover:text-signal-dim dark:hover:text-signal focus:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-full transition-colors"
                >
                  <HelpCircle size={15} />
                </button>
                {showTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-graphite text-stone dark:bg-stone dark:text-graphite rounded-md p-2.5 shadow-lg text-xs z-20 pointer-events-none">
                    Spoofer Shield checks for disguised executable extensions, Unicode Bidi/RTLO obfuscation, magic-byte header mismatches, and archive expansion ratios.
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {totalFlagged === 0
                ? `All ${totalReports} entries passed security checks`
                : `${totalFlagged} security notice${totalFlagged > 1 ? 's' : ''} detected in archive`}
            </p>
          </div>
        </div>

        {totalFlagged > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse security details' : 'Expand security details'}
            className="p-1.5 rounded-panel text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        )}
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-graphite/10 dark:border-white/10 text-center">
        <div className="px-2 py-1.5 rounded bg-gray-100/60 dark:bg-ink/40">
          <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
            Safe
          </span>
          <span className="text-lg font-mono tabular font-semibold text-verdigris">
            {safeCount}
          </span>
        </div>
        <div className="px-2 py-1.5 rounded bg-gray-100/60 dark:bg-ink/40">
          <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
            Warnings
          </span>
          <span className="text-lg font-mono tabular font-semibold text-signal-dim dark:text-signal">
            {warningReports.length}
          </span>
        </div>
        <div className="px-2 py-1.5 rounded bg-gray-100/60 dark:bg-ink/40">
          <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
            High Risk
          </span>
          <span className="text-lg font-mono tabular font-semibold text-rust">
            {dangerReports.length + (zipBombWarning ? 1 : 0)}
          </span>
        </div>
      </div>

      {/* Detailed Flagged List */}
      {isExpanded && totalFlagged > 0 && (
        <div className="mt-4 space-y-3 pt-3 border-t border-graphite/10 dark:border-white/10">
          {zipBombWarning && (
            <div className="p-3 rounded bg-rust/10 border border-rust/30 text-xs text-graphite dark:text-stone flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rust shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rust block mb-0.5">Zip Bomb Defense Intercept</span>
                <p className="text-gray-700 dark:text-gray-300">{zipBombWarning}</p>
              </div>
            </div>
          )}

          {[...dangerReports, ...warningReports].map((report, idx) => (
            <div
              key={`${report.filename}-${idx}`}
              className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                report.riskLevel === 'danger'
                  ? 'bg-rust/5 border-rust/30'
                  : 'bg-signal/10 border-signal/30'
              }`}
            >
              <FileCode
                size={16}
                className={`shrink-0 mt-0.5 ${
                  report.riskLevel === 'danger' ? 'text-rust' : 'text-signal-dim dark:text-signal'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono truncate font-medium text-graphite dark:text-stone">
                    {report.filename}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      report.riskLevel === 'danger'
                        ? 'bg-rust/20 text-rust'
                        : 'bg-signal/20 text-signal-dim dark:text-signal'
                    }`}
                  >
                    {report.riskLevel}
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 dark:text-gray-300">
                  {report.warnings.map((warn, wIdx) => (
                    <li key={wIdx}>{warn}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
