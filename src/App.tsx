import { useState } from 'react';
import { Archive, ShieldCheck, KeyRound, Layers, Trash2, CheckCircle2 } from 'lucide-react';
import { SafetySummaryPanel } from './components/SafetySummaryPanel';
import { ZipBombWarningPanel } from './components/ZipBombWarningPanel';
import { FileDropZone } from './components/FileDropZone';
import { PurgeConfirmationModal } from './components/PurgeConfirmationModal';
import { scanEntrySecurity, type EntrySecurityReport } from './lib/security/spooferShield';
import { checkZipBombThreshold, type ZipBombCheckResult, type ArchiveEntryMeta } from './lib/security/zipBomb';
import { aggregateVolumeSet, type MultiVolumeSetReport } from './lib/transcoder/volumeDetector';
import { scanEntryLeaks, type EntryLeakReport } from './lib/security/leakScanner';

interface FileEntryItem {
  name: string;
  compressedSize?: number;
  uncompressedSize?: number;
  magicBytes?: Uint8Array;
}

const INITIAL_SAMPLE_ENTRIES: FileEntryItem[] = [
  { name: 'document_v2.pdf', compressedSize: 150000, uncompressedSize: 200000 },
  { name: 'financial_report.pdf', compressedSize: 100000, uncompressedSize: 120000, magicBytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) }, // PE Executable disguised as PDF!
  { name: 'invoice_2025.pdf.exe', compressedSize: 50000, uncompressedSize: 80000 }, // Double extension
  { name: 'tax_return_\u202Egpj.exe', compressedSize: 40000, uncompressedSize: 60000 }, // RTLO bidi spoof
  { name: 'config/.env', compressedSize: 200, uncompressedSize: 1500 }, // Credential file
  { name: 'keys/id_rsa', compressedSize: 800, uncompressedSize: 3200 }, // Private key
];

function App() {
  const [activeEntries, setActiveEntries] = useState<FileEntryItem[]>([]);
  const [reports, setReports] = useState<EntrySecurityReport[]>([]);
  const [zipBombResult, setZipBombResult] = useState<ZipBombCheckResult | null>(null);
  const [volumeReport, setVolumeReport] = useState<MultiVolumeSetReport | null>(null);
  const [leakReports, setLeakReports] = useState<EntryLeakReport[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgedNotice, setPurgedNotice] = useState<string | null>(null);

  const processEntries = (files: FileEntryItem[], nameLabel?: string) => {
    setActiveEntries(files);

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
    if (nameLabel) setFileName(nameLabel);
  };

  const handleFilesSelected = (files: File[]) => {
    setPurgedNotice(null);
    const fileItems: FileEntryItem[] = files.map(f => ({
      name: f.name,
      compressedSize: f.size,
      uncompressedSize: f.size,
    }));
    processEntries(fileItems, files.length === 1 ? files[0].name : `${files.length} files archive`);
  };

  const handleScanSample = () => {
    setPurgedNotice(null);
    processEntries(INITIAL_SAMPLE_ENTRIES, 'untrusted_incoming_files.zip');
  };

  const handleTriggerBombSample = () => {
    setPurgedNotice(null);
    const bombEntries: FileEntryItem[] = [
      { name: 'highly_compressed_payload.bin', compressedSize: 1024, uncompressedSize: 524288000 },
    ];
    processEntries(bombEntries, 'synthetic_zip_bomb_test.zip');
  };

  const handleConfirmPurge = (purgedEntryNames: string[]) => {
    const sanitized = activeEntries.filter(e => !purgedEntryNames.includes(e.name));
    setPurgedNotice(`Successfully purged ${purgedEntryNames.length} flagged secret file(s). Repack pipeline is sanitized.`);
    processEntries(sanitized);
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
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          onScanSample={handleScanSample}
          onTriggerBombSample={handleTriggerBombSample}
        />

        {/* Purge Notice Banner */}
        {purgedNotice && (
          <div className="bg-verdigris/10 border border-verdigris/30 rounded-panel p-3.5 text-xs text-graphite dark:text-stone flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-verdigris shrink-0" />
            <span>{purgedNotice}</span>
          </div>
        )}

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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-rust">
                    <KeyRound size={16} />
                    <span>Pre-Flight Secret &amp; Credential Leak Intercept ({leakReports.length} Flagged)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(true)}
                    className="bg-rust hover:bg-rust/90 text-white inline-flex items-center gap-1.5 font-medium rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
                  >
                    <Trash2 size={14} />
                    <span>Review &amp; Purge Secrets</span>
                  </button>
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

      {/* Secret Leak Purge Modal */}
      <PurgeConfirmationModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        leakReports={leakReports}
        onConfirmPurge={handleConfirmPurge}
      />
    </div>
  );
}

export default App;
