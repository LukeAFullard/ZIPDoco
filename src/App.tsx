import { useState } from 'react';
import { Archive, ShieldCheck, KeyRound, Layers, Trash2, CheckCircle2, Languages, FileText } from 'lucide-react';
import { SafetySummaryPanel } from './components/SafetySummaryPanel';
import { ZipBombWarningPanel } from './components/ZipBombWarningPanel';
import { FileDropZone } from './components/FileDropZone';
import { PurgeConfirmationModal } from './components/PurgeConfirmationModal';
import { MojibakeRepairModal, type MangledEntryItem } from './components/MojibakeRepairModal';
import { AuditReportModal } from './components/AuditReportModal';
import { scanEntrySecurity, type EntrySecurityReport } from './lib/security/spooferShield';
import { checkZipBombThreshold, type ZipBombCheckResult, type ArchiveEntryMeta } from './lib/security/zipBomb';
import { aggregateVolumeSet, type MultiVolumeSetReport } from './lib/transcoder/volumeDetector';
import { scanEntryLeaks, type EntryLeakReport } from './lib/security/leakScanner';
import { scanArchiveMojibake } from './lib/security/mojibake';
import { generateAuditReport, type AuditReportData } from './lib/audit/auditReport';

interface FileEntryItem {
  name: string;
  compressedSize?: number;
  uncompressedSize?: number;
  magicBytes?: Uint8Array;
  rawBytes?: Uint8Array;
}

const INITIAL_SAMPLE_ENTRIES: FileEntryItem[] = [
  { name: 'document_v2.pdf', compressedSize: 150000, uncompressedSize: 200000 },
  { name: 'rÃ©sumÃ©_2025.pdf', compressedSize: 90000, uncompressedSize: 110000 }, // Double-encoded Mojibake
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
  const [mangledEntries, setMangledEntries] = useState<MangledEntryItem[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReportData | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isMojibakeModalOpen, setIsMojibakeModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const processEntries = (files: FileEntryItem[], nameLabel?: string) => {
    setActiveEntries(files);
    const activeFileName = nameLabel ?? fileName ?? 'archive.zip';

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

    // 5. Mojibake Encoding Scan
    const mojibakeResults = scanArchiveMojibake(files);
    setMangledEntries(mojibakeResults);

    // 6. Generate Audit Report Data
    const generatedAudit = generateAuditReport({
      archiveName: activeFileName,
      entries: files,
      securityReports,
      zipBombReport: bombCheck,
      leakReports: leaks,
      mojibakeFindings: mojibakeResults.map(m => m.mojibake),
    });
    setAuditReport(generatedAudit);

    setHasScanned(true);
    if (nameLabel) setFileName(nameLabel);
  };

  const handleFilesSelected = (files: File[]) => {
    setSessionNotice(null);
    const fileItems: FileEntryItem[] = files.map(f => ({
      name: f.name,
      compressedSize: f.size,
      uncompressedSize: f.size,
    }));
    processEntries(fileItems, files.length === 1 ? files[0].name : `${files.length} files archive`);
  };

  const handleScanSample = () => {
    setSessionNotice(null);
    processEntries(INITIAL_SAMPLE_ENTRIES, 'untrusted_incoming_files.zip');
  };

  const handleTriggerBombSample = () => {
    setSessionNotice(null);
    const bombEntries: FileEntryItem[] = [
      { name: 'highly_compressed_payload.bin', compressedSize: 1024, uncompressedSize: 524288000 },
    ];
    processEntries(bombEntries, 'synthetic_zip_bomb_test.zip');
  };

  const handleConfirmPurge = (purgedEntryNames: string[]) => {
    const sanitized = activeEntries.filter(e => !purgedEntryNames.includes(e.name));
    setSessionNotice(`Successfully purged ${purgedEntryNames.length} flagged secret file(s). Repack pipeline is sanitized.`);
    processEntries(sanitized);
  };

  const handleApplyMojibakeRepairs = (repairsMap: Record<string, string>) => {
    const repairedFiles = activeEntries.map(e => {
      if (repairsMap[e.name]) {
        return { ...e, name: repairsMap[e.name] };
      }
      return e;
    });
    setSessionNotice(`Successfully normalized ${Object.keys(repairsMap).length} Mojibake filename(s) into UTF-8.`);
    processEntries(repairedFiles);
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

        {/* Notice Banner */}
        {sessionNotice && (
          <div className="bg-verdigris/10 border border-verdigris/30 rounded-panel p-3.5 text-xs text-graphite dark:text-stone flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-verdigris shrink-0" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {/* Active Session Displays */}
        {hasScanned && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono border-b border-graphite/10 dark:border-white/10 pb-2">
              <span className="truncate max-w-xs">ACTIVE SESSION: {fileName} ({reports.length} ENTRIES)</span>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="bg-stone border border-graphite/20 dark:bg-graphite dark:border-white/15 dark:text-stone text-graphite hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 px-2.5 py-1 rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <FileText size={14} className="text-signal-dim dark:text-signal" />
                <span>Export Audit Report</span>
              </button>
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

            {/* Mojibake Repair Banner */}
            {mangledEntries.length > 0 && (
              <div className="bg-stone dark:bg-graphite rounded-panel border border-signal/40 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-signal-dim dark:text-signal">
                    <Languages size={16} />
                    <span>Mojibake Filename Encoding Anomalies ({mangledEntries.length} Detected)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMojibakeModalOpen(true)}
                    className="bg-signal/20 hover:bg-signal/30 text-graphite dark:text-stone inline-flex items-center gap-1.5 font-medium rounded-panel border border-signal/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal px-3 py-1.5 text-xs"
                  >
                    <Languages size={14} />
                    <span>Review &amp; Repair Names</span>
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-[11px]">
                  Detected character encoding mismatches (e.g., Shift-JIS or double-encoded UTF-8). You can inspect and convert them into standard UTF-8 before repacking.
                </p>
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

      {/* Mojibake Repair Modal */}
      <MojibakeRepairModal
        isOpen={isMojibakeModalOpen}
        onClose={() => setIsMojibakeModalOpen(false)}
        mangledEntries={mangledEntries}
        onApplyRepairs={handleApplyMojibakeRepairs}
      />

      {/* Audit Report Modal */}
      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        report={auditReport}
      />
    </div>
  );
}

export default App;
