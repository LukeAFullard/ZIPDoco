import React, { useState } from 'react';
import { Archive, ShieldCheck, Upload, RefreshCw } from 'lucide-react';
import { SafetySummaryPanel } from './components/SafetySummaryPanel';
import { scanEntrySecurity, type EntrySecurityReport } from './lib/security/spooferShield';

const SAMPLE_ENTRIES = [
  { name: 'document_v2.pdf' },
  { name: 'financial_report.pdf', magicBytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) }, // PE Executable disguised as PDF!
  { name: 'invoice_2025.pdf.exe' }, // Double extension
  { name: 'tax_return_\u202Egpj.exe' }, // RTLO bidi spoof
  { name: 'project_notes.txt' },
  { name: 'company_logo.png' },
];

function App() {
  const [reports, setReports] = useState<EntrySecurityReport[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleScanSample = () => {
    const scanned = SAMPLE_ENTRIES.map(e => scanEntrySecurity(e));
    setReports(scanned);
    setHasScanned(true);
    setFileName('untrusted_incoming_files.zip');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const scanned = fileList.map(f => scanEntrySecurity({ name: f.name }));
    setReports(scanned);
    setHasScanned(true);
    setFileName(fileList.length === 1 ? fileList[0].name : `${fileList.length} files archive`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone dark:bg-ink text-graphite dark:text-stone font-sans transition-colors">
      <header className="border-b border-graphite/20 dark:border-white/15 bg-stone dark:bg-graphite">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive size={24} className="text-signal-dim dark:text-signal" />
            <h1 className="text-xl font-bold tracking-tight">ZIPDoco</h1>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded bg-gray-200/60 dark:bg-ink/60 text-gray-600 dark:text-gray-300">
            Offline PWA Intake
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Intake drop zone */}
        <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 shadow-sm p-6 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-signal/15 text-signal-dim dark:text-signal">
            <Upload size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Safe Archive Intake</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
              Select or drop untrusted archives (ZIP, RAR, 7z, TAR) for client-side security inspection and extraction without server upload.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="bg-graphite hover:bg-ink dark:bg-stone dark:hover:bg-gray-300 text-stone dark:text-ink inline-flex items-center justify-center font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 cursor-pointer px-4 py-2 text-sm">
              <span>Select File</span>
              <input
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".zip,.rar,.7z,.tar,.gz,.bz2,.xz"
              />
            </label>

            <button
              type="button"
              onClick={handleScanSample}
              className="bg-stone border border-graphite/20 hover:bg-gray-100 dark:bg-graphite dark:text-stone dark:border-white/15 dark:hover:bg-gray-800 text-graphite inline-flex items-center gap-1.5 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-4 py-2 text-sm"
            >
              <RefreshCw size={15} />
              <span>Load Sample Untrusted Archive</span>
            </button>
          </div>
        </div>

        {/* Security Inspection Panel */}
        {hasScanned && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
              <span>ACTIVE SESSION: {fileName}</span>
              <span>{reports.length} ENTRIES</span>
            </div>
            <SafetySummaryPanel reports={reports} />
          </div>
        )}

        {!hasScanned && (
          <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 p-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <ShieldCheck size={18} className="text-verdigris shrink-0" />
            <span>
              100% Client-Side Processing. Zero network calls are ever executed. Files stay inside browser WebAssembly memory and OPFS.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
