import type { EntrySecurityReport } from '../security/spooferShield';
import type { ZipBombCheckResult } from '../security/zipBomb';
import type { EntryLeakReport } from '../security/leakScanner';
import type { MojibakeDetectionResult } from '../security/mojibake';

export interface AuditReportManifestItem {
  name: string;
  compressedSize?: number;
  uncompressedSize?: number;
  hasRisk: boolean;
  riskReasons: string[];
}

export interface AuditReportData {
  schemaVersion: '1.0';
  generatedAt: string;
  archiveName: string;
  summary: {
    totalEntries: number;
    cleanEntries: number;
    flaggedEntries: number;
    spooferRisksCount: number;
    secretLeaksCount: number;
    mojibakeCount: number;
    zipBombDetected: boolean;
    overallRatio: number;
    riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  details: {
    spooferReports: EntrySecurityReport[];
    zipBombReport: ZipBombCheckResult | null;
    secretLeakReports: EntryLeakReport[];
    mojibakeFindings: MojibakeDetectionResult[];
  };
  manifest: AuditReportManifestItem[];
}

export interface GenerateAuditReportOptions {
  archiveName: string;
  entries: Array<{ name: string; compressedSize?: number; uncompressedSize?: number }>;
  securityReports: EntrySecurityReport[];
  zipBombReport: ZipBombCheckResult | null;
  leakReports: EntryLeakReport[];
  mojibakeFindings: MojibakeDetectionResult[];
}

/**
 * Generates a structured Audit Report capturing security, bomb, leak, and encoding metrics.
 */
export function generateAuditReport(options: GenerateAuditReportOptions): AuditReportData {
  const { archiveName, entries, securityReports, zipBombReport, leakReports, mojibakeFindings } = options;

  const spooferRisksCount = securityReports.filter(r => r.riskLevel !== 'safe').length;
  const secretLeaksCount = leakReports.filter(l => l.isFlagged).length;
  const mojibakeCount = mojibakeFindings.filter(m => m.isMangled).length;
  const zipBombDetected = zipBombReport?.exceedsThreshold ?? false;

  // Build manifest
  const manifest: AuditReportManifestItem[] = entries.map(e => {
    const spoofer = securityReports.find(s => s.entryName === e.name);
    const leak = leakReports.find(l => l.entryName === e.name);
    const mojibake = mojibakeFindings.find(m => m.original === e.name);

    const reasons: string[] = [];
    if (spoofer && spoofer.riskLevel !== 'safe') {
      reasons.push(`Spoofer Risk (${spoofer.riskLevel}): ${spoofer.warnings.join(', ')}`);
    }
    if (leak && leak.isFlagged) {
      reasons.push('Secret or credential leak risk detected');
    }
    if (mojibake && mojibake.isMangled) {
      reasons.push(`Mojibake encoding: ${mojibake.detectedEncoding}`);
    }

    return {
      name: e.name,
      compressedSize: e.compressedSize,
      uncompressedSize: e.uncompressedSize,
      hasRisk: reasons.length > 0,
      riskReasons: reasons,
    };
  });

  const flaggedEntriesCount = manifest.filter(m => m.hasRisk).length;
  const cleanEntriesCount = manifest.length - flaggedEntriesCount;

  // Risk rating calculation
  let riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (zipBombDetected || securityReports.some(r => r.riskLevel === 'high') || secretLeaksCount > 0) {
    riskRating = 'CRITICAL';
  } else if (spooferRisksCount > 0) {
    riskRating = 'HIGH';
  } else if (mojibakeCount > 0 || flaggedEntriesCount > 0) {
    riskRating = 'MEDIUM';
  }

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    archiveName,
    summary: {
      totalEntries: entries.length,
      cleanEntries: cleanEntriesCount,
      flaggedEntries: flaggedEntriesCount,
      spooferRisksCount,
      secretLeaksCount,
      mojibakeCount,
      zipBombDetected,
      overallRatio: zipBombReport?.overallRatio ?? 1,
      riskRating,
    },
    details: {
      spooferReports: securityReports,
      zipBombReport,
      secretLeakReports: leakReports,
      mojibakeFindings,
    },
    manifest,
  };
}

/**
 * Triggers a browser download of the Audit Report as formatted JSON.
 */
export function exportAuditReportJSON(report: AuditReportData): void {
  const jsonString = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeFilename = report.archiveName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_report_${safeFilename}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
