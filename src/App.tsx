import { useState } from 'react';
import { Archive, ShieldCheck, KeyRound, Layers, Trash2, CheckCircle2, Languages, FileText, GitCompare, Boxes, BookOpen } from 'lucide-react';
import { SafetySummaryPanel } from './components/SafetySummaryPanel';
import { ZipBombWarningPanel } from './components/ZipBombWarningPanel';
import { FileDropZone } from './components/FileDropZone';
import { PurgeConfirmationModal } from './components/PurgeConfirmationModal';
import { MojibakeRepairModal, type MangledEntryItem } from './components/MojibakeRepairModal';
import { AuditReportModal } from './components/AuditReportModal';
import { ArchiveDiffModal } from './components/ArchiveDiffModal';
import { FileTree } from './components/FileTree';
import { QuickLookModal, type QuickLookFile } from './components/QuickLookModal';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { ComicReaderModal } from './components/ComicReaderModal';
import { scanEntrySecurity, type EntrySecurityReport } from './lib/security/spooferShield';
import { checkZipBombThreshold, type ZipBombCheckResult, type ArchiveEntryMeta } from './lib/security/zipBomb';
import { aggregateVolumeSet, type MultiVolumeSetReport } from './lib/transcoder/volumeDetector';
import { scanEntryLeaks, type EntryLeakReport } from './lib/security/leakScanner';
import { scanArchiveMojibake } from './lib/security/mojibake';
import { generateAuditReport, type AuditReportData } from './lib/audit/auditReport';
import { consolidateBatchQueue, type BatchArchiveItem, type BatchConsolidationReport } from './lib/batch/batchConsolidator';
import { isComicArchive, parseComicInfo } from './lib/viewer/comicReader';
import { setupFileLaunchHandler } from './lib/pwa/fileHandling';
import { setupShareTargetHandler } from './lib/pwa/shareHandler';
import { useEffect, useCallback } from 'react';

interface FileEntryItem {
  name: string;
  compressedSize?: number;
  uncompressedSize?: number;
  magicBytes?: Uint8Array;
  rawBytes?: Uint8Array;
  content?: string;
}

const INITIAL_SAMPLE_ENTRIES: FileEntryItem[] = [
  { name: 'document_v2.pdf', compressedSize: 150000, uncompressedSize: 200000, content: 'PDF document content sample' },
  { name: 'rÃ©sumÃ©_2025.pdf', compressedSize: 90000, uncompressedSize: 110000, content: 'Resume details' },
  { name: 'financial_report.pdf', compressedSize: 100000, uncompressedSize: 120000, magicBytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), content: 'MZ Header content' },
  { name: 'invoice_2025.pdf.exe', compressedSize: 50000, uncompressedSize: 80000 },
  { name: 'tax_return_\u202Egpj.exe', compressedSize: 40000, uncompressedSize: 60000 },
  { name: 'config/.env', compressedSize: 200, uncompressedSize: 1500, content: 'AWS_SECRET_ACCESS_KEY=AKIA1234567890' },
  { name: 'keys/id_rsa', compressedSize: 800, uncompressedSize: 3200, content: '-----BEGIN RSA PRIVATE KEY-----' },
];

const COMIC_SAMPLE_ENTRIES: FileEntryItem[] = [
  { name: 'cover.jpg', compressedSize: 120000, uncompressedSize: 150000, content: 'sample image data 1' },
  { name: 'page_01.jpg', compressedSize: 110000, uncompressedSize: 140000, content: 'sample image data 2' },
  { name: 'page_02.jpg', compressedSize: 115000, uncompressedSize: 145000, content: 'sample image data 3' },
  { name: 'page_03.jpg', compressedSize: 125000, uncompressedSize: 155000, content: 'sample image data 4' },
  { name: 'page_04.jpg', compressedSize: 130000, uncompressedSize: 160000, content: 'sample image data 5' },
];

const PDF_SAMPLE_ENTRIES: FileEntryItem[] = [
  { name: 'security_audit_report.pdf', compressedSize: 350000, uncompressedSize: 500000, content: 'Confidential Security Audit Report for Untrusted Archives\n\nExecutive Summary:\nAll archive entries scanned successfully with zero network dependencies.' },
  { name: 'architecture_diagram.pdf', compressedSize: 250000, uncompressedSize: 400000, content: 'WebAssembly & OPFS Streaming Architecture Overview' },
];

const SECONDARY_DIFF_SAMPLE: FileEntryItem[] = [
  { name: 'document_v2.pdf', compressedSize: 180000, uncompressedSize: 220000, content: 'PDF document content sample v2 modified' },
  { name: 'config/.env', compressedSize: 200, uncompressedSize: 1500, content: 'AWS_SECRET_ACCESS_KEY=AKIA1234567890' },
  { name: 'new_release_notes.md', compressedSize: 5000, uncompressedSize: 12000, content: '# Release Notes v2.0' },
];

function App() {
  const [activeEntries, setActiveEntries] = useState<FileEntryItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<EntrySecurityReport[]>([]);
  const [zipBombResult, setZipBombResult] = useState<ZipBombCheckResult | null>(null);
  const [volumeReport, setVolumeReport] = useState<MultiVolumeSetReport | null>(null);
  const [leakReports, setLeakReports] = useState<EntryLeakReport[]>([]);
  const [mangledEntries, setMangledEntries] = useState<MangledEntryItem[]>([]);
  const [auditReport, setAuditReport] = useState<AuditReportData | null>(null);
  const [batchReport, setBatchReport] = useState<BatchConsolidationReport | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isMojibakeModalOpen, setIsMojibakeModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isComicReaderOpen, setIsComicReaderOpen] = useState(false);

  const [quickLookFile, setQuickLookFile] = useState<QuickLookFile | null>(null);
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(false);

  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const processEntries = useCallback((files: FileEntryItem[], nameLabel?: string) => {
    setActiveEntries(files);
    setSelectedPaths(new Set(files.map(f => f.name)));
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

    // 6. Batch Queue Consolidation & Deduplication Scan
    const batchQueue: BatchArchiveItem[] = [
      {
        id: 'current_session',
        name: activeFileName,
        size: files.reduce((acc, cur) => acc + (cur.compressedSize || 1000), 0),
        entries: files.map(f => ({ path: f.name, size: f.uncompressedSize || 1000, content: f.content })),
      },
    ];
    const consolidation = consolidateBatchQueue(batchQueue);
    setBatchReport(consolidation);

    // 7. Generate Audit Report Data
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
  }, [fileName]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSessionNotice(null);
    const fileItems: FileEntryItem[] = files.map(f => ({
      name: f.name,
      compressedSize: f.size,
      uncompressedSize: f.size,
    }));
    processEntries(fileItems, files.length === 1 ? files[0].name : `${files.length} files archive`);
  }, [processEntries]);

  useEffect(() => {
    const cleanupLaunch = setupFileLaunchHandler((launchedFiles) => {
      if (launchedFiles.length > 0) {
        handleFilesSelected(launchedFiles);
      }
    });
    const cleanupShare = setupShareTargetHandler((sharedFiles) => {
      if (sharedFiles.length > 0) {
        handleFilesSelected(sharedFiles);
      }
    });
    return () => {
      cleanupLaunch();
      cleanupShare();
    };
  }, [handleFilesSelected]);

  const handleScanSample = () => {
    setSessionNotice(null);
    processEntries(INITIAL_SAMPLE_ENTRIES, 'untrusted_incoming_files.zip');
  };

  const handleScanComicSample = () => {
    setSessionNotice(null);
    processEntries(COMIC_SAMPLE_ENTRIES, 'Cyberpunk_Issue_01.cbz');
  };

  const handleScanPdfSample = () => {
    setSessionNotice(null);
    processEntries(PDF_SAMPLE_ENTRIES, 'quarterly_security_docs.zip');
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

  const handleTogglePath = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedPaths(new Set(activeEntries.map(e => e.name)));
    } else {
      setSelectedPaths(new Set());
    }
  };

  const handlePreviewFile = (path: string) => {
    const foundEntry = activeEntries.find(e => e.name === path);
    if (!foundEntry) return;

    setQuickLookFile({
      name: foundEntry.name,
      uncompressedSize: foundEntry.uncompressedSize || foundEntry.compressedSize,
      content: foundEntry.content || foundEntry.rawBytes,
    });
    setIsQuickLookOpen(true);
  };

  const isComic = isComicArchive(fileName || '', activeEntries);
  const comicInfo = parseComicInfo(fileName || '', activeEntries);

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
          onScanComicSample={handleScanComicSample}
          onScanPdfSample={handleScanPdfSample}
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono border-b border-graphite/10 dark:border-white/10 pb-2">
              <span className="truncate max-w-xs">
                ACTIVE SESSION: {fileName} ({selectedPaths.size}/{activeEntries.length} SELECTED)
              </span>
              <div className="flex items-center gap-2">
                {isComic && (
                  <button
                    type="button"
                    onClick={() => setIsComicReaderOpen(true)}
                    className="bg-signal/20 border border-signal/40 dark:text-stone text-graphite hover:bg-signal/30 inline-flex items-center gap-1 px-2.5 py-1 rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal font-semibold"
                  >
                    <BookOpen size={14} className="text-signal-dim dark:text-signal" />
                    <span>Open Comic Reader ({comicInfo.totalPages} Pages)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDiffModalOpen(true)}
                  className="bg-stone border border-graphite/20 dark:bg-graphite dark:border-white/15 dark:text-stone text-graphite hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 px-2.5 py-1 rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <GitCompare size={14} className="text-signal-dim dark:text-signal" />
                  <span>Archive Diff</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="bg-stone border border-graphite/20 dark:bg-graphite dark:border-white/15 dark:text-stone text-graphite hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center gap-1 px-2.5 py-1 rounded-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <FileText size={14} className="text-signal-dim dark:text-signal" />
                  <span>Export Audit Report</span>
                </button>
              </div>
            </div>

            {/* Batch Consolidator Summary Banner */}
            {batchReport && (
              <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <Boxes size={16} className="text-signal-dim dark:text-signal" />
                  <span>Batch Queue Consolidation: {batchReport.uniqueEntriesCount} Unique / {batchReport.duplicateEntriesCount} Duplicate File(s)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-verdigris/15 text-verdigris font-semibold">
                  OPFS Deduplication Ready
                </span>
              </div>
            )}

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

            {/* Thumbnail Grid for Image-Heavy Archives */}
            <ThumbnailGrid
              entries={activeEntries}
              onPreviewImage={handlePreviewFile}
            />

            {/* Interactive File Tree Hierarchy & Full-Text Instant Search */}
            <FileTree
              entries={activeEntries.map(e => ({ ...e, path: e.name }))}
              securityReports={reports}
              selectedPaths={selectedPaths}
              onTogglePath={handleTogglePath}
              onToggleSelectAll={handleToggleSelectAll}
              onPreviewFile={handlePreviewFile}
            />

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

      {/* Side-by-Side Archive Diff Modal */}
      <ArchiveDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        primaryEntries={activeEntries.map(e => ({ path: e.name, size: e.uncompressedSize, content: e.content }))}
        secondaryEntries={SECONDARY_DIFF_SAMPLE.map(e => ({ path: e.name, size: e.uncompressedSize, content: e.content }))}
      />

      {/* Zero-Extract Quick Look Modal */}
      <QuickLookModal
        isOpen={isQuickLookOpen}
        onClose={() => setIsQuickLookOpen(false)}
        file={quickLookFile}
      />

      {/* Comic Archive Reader View Modal */}
      <ComicReaderModal
        isOpen={isComicReaderOpen}
        onClose={() => setIsComicReaderOpen(false)}
        archiveName={fileName || 'comic.cbz'}
        entries={activeEntries}
      />
    </div>
  );
}

export default App;
