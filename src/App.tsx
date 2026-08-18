import React, { useState } from 'react';
import { Archive, ShieldCheck, Upload, RefreshCw, KeyRound, Layers } from 'lucide-react';
import { SafetySummaryPanel } from './components/SafetySummaryPanel';
import { ZipBombWarningPanel } from './components/ZipBombWarningPanel';
import { scanEntrySecurity, type EntrySecurityReport } from './lib/security/spooferShield';
import { checkZipBombThreshold, type ZipBombCheckResult, type ArchiveEntryMeta } from './lib/security/zipBomb';
import { aggregateVolumeSet, type MultiVolumeSetReport } from './lib/transcoder/volumeDetector';
import { scanEntryLeaks, type EntryLeakReport } from './lib/security/leakScanner';

const SAMPLE_ENTRIES: ArchiveEntryMeta[] = [
  { name: 'document_v2.pdf', compressedSize: 150000, uncompressedSize: 200000 },
  { name: 'financial_report.pdf', compressedSize: 100000, uncompressedSize: 120000, magicBytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) }, // PE Executable disguised as PDF!
  { name: 'invoice_2025.pdf.exe', compressedSize: 50000, uncompressedSize: 80000 }, // Double extension
  { name: 'tax_return_\u202Egpj.exe', compressedSize: 40000, uncompressedSize: 60000 }, // RTLO bidi spoof
  { name: 'config/.env', compressedSize: 200, uncompressedSize: 1500 }, // Credential file
  { name: 'keys/id_rsa', compressedSize: 800, uncompressedSize: 3200 }, // Private key
];

function App() {
  const [reports, setReports] = useState<EntrySecurityReport[]>([]);
  const [zipBombResult, setZipBombResult] = useState<ZipBombCheckResult | null>(null);
  const [volumeReport, setVolumeReport] = useState<MultiVolumeSetReport | null>(null);
  const [leakReports, setLeakReports] = useState<EntryLeakReport[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const processEntries = (files: Array<{ name: string; compressedSize?: number; uncompressedSize?: number; magicBytes?: Uint8Array }>) => {
    // 1. Spoofer Shield Scan
    const securityReports = files.map(f => scanEntrySecurity({ name: f.name, magicBytes: f.magicBytes }));
    setReports(securityReports);

    // 2. Zip Bomb Pre-Flight Check
    const entriesMeta: ArchiveEntryMeta[] = files.map(f => ({
      name: f.name,
      compressedSize: f.compressedSize ?? 1000,
      uncompressedSize: f.uncompressedSize ?? 1000,
      magicBytes: f.magicBytes,
    }));
    const bombCheck = checkZipBombThreshold(entriesMeta, { maxRatio: 100 });
    setZipBombResult(bombCheck);

    // 3. Multi-Volume Set Scan
    const volumeCheck = aggregateVolumeSet(files.map(f => ({ name: f.name })));
    setVolumeReport(volumeCheck);

    // 4. Pre-Flight Secret Leak Scan
    const leaks = files.map(f => scanEntryLeaks(f.name));
    setLeakReports(leaks.filter(l => l.isFlagged));

    setHasScanned(true);
  };

  const handleScanSample = () => {
    processEntries(SAMPLE_ENTRIES);
    setFileName('untrusted_incoming_files.zip');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    processEntries(fileList.map(f => ({ name: f.name, compressedSize: f.size, uncompressedSize: f.size })));
    setFileName(fileList.length === 1 ? fileList[0].name : `${fileList.length} files archive`);
  };

  const handleTriggerBombSample = () => {
    const bombEntries: ArchiveEntryMeta[] = [
      { name: 'highly_compressed_payload.bin', compressedSize: 1024, uncompressedSize: 524288000 }, // ~500,000:1 ratio
    ];
    processEntries(bombEntries);
    setFileName('synthetic_zip_bomb_test.zip');
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
                multiple
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

            <button
              type="button"
              onClick={handleTriggerBombSample}
              className="bg-stone border border-rust/30 hover:bg-rust/10 dark:bg-graphite dark:border-rust/40 text-rust inline-flex items-center gap-1.5 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-4 py-2 text-sm"
            >
              <ShieldCheck size={15} />
              <span>Simulate Zip Bomb Test</span>
            </button>
          </div>
        </div>

        {/* Active Session Displays */}
        {hasScanned && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono border-b border-graphite/10 dark:border-white/10 pb-2">
              <span>ACTIVE SESSION: {fileName}</span>
              <span>{reports.length} ENTRIES</span>
            </div>

            {/* Zip Bomb Warning Panel */}
            {zipBombResult && <ZipBombWarningPanel checkResult={zipBombResult} />}

            {/* Multi-Volume Report */}
            {volumeReport && volumeReport.isMultiVolumeSet && (
              <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-graphite dark:text-stone">
                  <Layers size={16} className="text-signal-dim dark:text-signal" />
                  <span>Multi-Volume Archive Set ({volumeReport.format?.toUpperCase()})</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{volumeReport.promptMessage}</p>
              </div>
            )}

            {/* Secret Leak Findings Summary */}
            {leakReports.length > 0 && (
              <div className="bg-stone dark:bg-graphite rounded-panel border border-rust/30 p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-rust">
                  <KeyRound size={16} />
                  <span>Pre-Flight Secret & Credential Leak Intercept ({leakReports.length} Flagged)</span>
                </div>
                <ul className="space-y-2 pl-2 border-l-2 border-rust/30">
                  {leakReports.map((leak, idx) => (
                    <li key={idx} className="space-y-0.5">
                      <span className="font-mono font-medium text-graphite dark:text-stone">{leak.entryName}</span>
                      {leak.filenameLeaks.map((f, fIdx) => (
                        <p key={fIdx} className="text-rust text-[11px]">
                          • {f.description}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety & Spoofer Summary Panel */}
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
