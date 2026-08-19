import { FileText, Download, Printer, X, ShieldAlert, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { exportAuditReportJSON, type AuditReportData } from '../lib/audit/auditReport';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AuditReportData | null;
}

export function AuditReportModal({ isOpen, onClose, report }: AuditReportModalProps) {
  if (!isOpen || !report) return null;

  const { summary, manifest, archiveName, generatedAt } = report;

  const handleDownloadJSON = () => {
    exportAuditReportJSON(report);
  };

  const handlePrint = () => {
    window.print();
  };

  const getBadgeStyle = (rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    switch (rating) {
      case 'CRITICAL':
        return 'bg-rust/20 text-rust border-rust/40';
      case 'HIGH':
        return 'bg-signal/20 text-signal-dim dark:text-signal border-signal/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40';
      case 'LOW':
        return 'bg-verdigris/20 text-verdigris border-verdigris/40';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-lg w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-graphite/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-panel bg-graphite/10 dark:bg-stone/10 text-graphite dark:text-stone">
              <FileText size={20} />
            </div>
            <div>
              <h2 id="audit-modal-title" className="text-base font-semibold text-graphite dark:text-stone">
                Exportable Security Audit Report
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {archiveName} • {new Date(generatedAt).toLocaleString()}
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

        {/* Report Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone/80 dark:bg-ink/60 border border-graphite/10 dark:border-white/10 rounded-panel p-3 space-y-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
                Risk Level
              </span>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border ${getBadgeStyle(summary.riskRating)}`}>
                  {summary.riskRating}
                </span>
              </div>
            </div>

            <div className="bg-stone/80 dark:bg-ink/60 border border-graphite/10 dark:border-white/10 rounded-panel p-3 space-y-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
                Total Files
              </span>
              <p className="text-lg font-mono tabular font-medium text-graphite dark:text-stone">
                {summary.totalEntries}
              </p>
            </div>

            <div className="bg-stone/80 dark:bg-ink/60 border border-graphite/10 dark:border-white/10 rounded-panel p-3 space-y-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
                Clean Files
              </span>
              <p className="text-lg font-mono tabular font-medium text-verdigris">
                {summary.cleanEntries}
              </p>
            </div>

            <div className="bg-stone/80 dark:bg-ink/60 border border-graphite/10 dark:border-white/10 rounded-panel p-3 space-y-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
                Flagged Risks
              </span>
              <p className={`text-lg font-mono tabular font-medium ${summary.flaggedEntries > 0 ? 'text-rust' : 'text-gray-500'}`}>
                {summary.flaggedEntries}
              </p>
            </div>
          </div>

          {/* Security Findings Highlights */}
          <div className="space-y-3">
            <h3 className="font-semibold text-graphite dark:text-stone text-xs uppercase tracking-wide">
              Inspection Findings Overview
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-panel border border-graphite/10 dark:border-white/10 bg-stone/40 dark:bg-ink/30 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-graphite dark:text-stone">
                  {summary.spooferRisksCount > 0 ? (
                    <ShieldAlert size={15} className="text-rust shrink-0" />
                  ) : (
                    <ShieldCheck size={15} className="text-verdigris shrink-0" />
                  )}
                  <span>Extension &amp; Magic-Byte Spoofs: {summary.spooferRisksCount}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  {summary.spooferRisksCount > 0
                    ? 'Flagged executable extensions disguised as documents or RTLO character overrides.'
                    : 'No filename spoofer or magic-byte mismatch anomalies detected.'}
                </p>
              </div>

              <div className="p-3 rounded-panel border border-graphite/10 dark:border-white/10 bg-stone/40 dark:bg-ink/30 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-graphite dark:text-stone">
                  {summary.secretLeaksCount > 0 ? (
                    <KeyRound size={15} className="text-rust shrink-0" />
                  ) : (
                    <ShieldCheck size={15} className="text-verdigris shrink-0" />
                  )}
                  <span>Secret &amp; Credential Leaks: {summary.secretLeaksCount}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                  {summary.secretLeaksCount > 0
                    ? 'Sensitive credential files (.env, id_rsa, API keys) identified in pre-flight scan.'
                    : 'No secret patterns or unencrypted credential files detected.'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed File Manifest */}
          <div className="space-y-3">
            <h3 className="font-semibold text-graphite dark:text-stone text-xs uppercase tracking-wide">
              Archive Entry Manifest ({manifest.length})
            </h3>
            <div className="border border-graphite/10 dark:border-white/10 rounded-panel overflow-x-auto bg-stone/40 dark:bg-ink/30 max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-graphite/10 dark:border-white/10 bg-stone/80 dark:bg-ink/80 text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold">Entry Path</th>
                    <th className="p-2.5 font-semibold">Compressed</th>
                    <th className="p-2.5 font-semibold">Uncompressed</th>
                    <th className="p-2.5 font-semibold">Notes / Risks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite/10 dark:divide-white/10">
                  {manifest.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone/80 dark:hover:bg-ink/50 transition-colors">
                      <td className="p-2.5 whitespace-nowrap">
                        {item.hasRisk ? (
                          <span className="inline-flex items-center gap-1 text-rust font-semibold text-[11px]">
                            <AlertTriangle size={13} />
                            <span>Risk</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-verdigris font-semibold text-[11px]">
                            <ShieldCheck size={13} />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-graphite dark:text-stone max-w-xs truncate" title={item.name}>
                        {item.name}
                      </td>
                      <td className="p-2.5 font-mono tabular text-gray-500 dark:text-gray-400">
                        {item.compressedSize ? `${(item.compressedSize / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="p-2.5 font-mono tabular text-gray-500 dark:text-gray-400">
                        {item.uncompressedSize ? `${(item.uncompressedSize / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="p-2.5 text-[11px] text-gray-500 dark:text-gray-400 max-w-xs">
                        {item.riskReasons.length > 0 ? item.riskReasons.join(' | ') : 'Passed safety checks'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-graphite/10 dark:border-white/10 flex items-center justify-between gap-3 bg-stone/50 dark:bg-ink/30">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-medium rounded-panel bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-panel bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-4 py-2 text-xs font-medium rounded-panel bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <Download size={14} />
              <span>Export Audit JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
