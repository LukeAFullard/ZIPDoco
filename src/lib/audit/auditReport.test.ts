import { describe, it, expect } from 'vitest';
import { generateAuditReport } from './auditReport';
import type { EntrySecurityReport } from '../security/spooferShield';
import type { ZipBombCheckResult } from '../security/zipBomb';
import type { EntryLeakReport } from '../security/leakScanner';

describe('Audit Report Generation Utility', () => {
  it('generates a clean audit report for safe archives', () => {
    const report = generateAuditReport({
      archiveName: 'safe_archive.zip',
      entries: [
        { name: 'doc.pdf', compressedSize: 1000, uncompressedSize: 1200 },
        { name: 'photo.jpg', compressedSize: 5000, uncompressedSize: 5100 },
      ],
      securityReports: [
        {
          filename: 'doc.pdf',
          riskLevel: 'safe',
          warnings: [],
          bidi: { hasBidi: false, charactersFound: [] },
          executable: { isDisguised: false, isRiskyExtension: false, extension: 'pdf' },
          magicByte: { isMismatch: false, claimedExtension: 'pdf' }
        },
        {
          filename: 'photo.jpg',
          riskLevel: 'safe',
          warnings: [],
          bidi: { hasBidi: false, charactersFound: [] },
          executable: { isDisguised: false, isRiskyExtension: false, extension: 'jpg' },
          magicByte: { isMismatch: false, claimedExtension: 'jpg' }
        },
      ],
      zipBombReport: {
        isBombWarning: false,
        globalRatio: 1.1,
        maxEntryRatio: 1.1,
        totalCompressed: 6000,
        totalUncompressed: 6300,
        nestedArchivesDetected: false
      },
      leakReports: [],
      mojibakeFindings: [],
    });

    expect(report.schemaVersion).toBe('1.0');
    expect(report.summary.totalEntries).toBe(2);
    expect(report.summary.cleanEntries).toBe(2);
    expect(report.summary.flaggedEntries).toBe(0);
    expect(report.summary.riskRating).toBe('LOW');
    expect(report.manifest[0].hasRisk).toBe(false);
  });

  it('assigns CRITICAL risk rating when zip bomb or secret leaks are present', () => {
    const mockLeak: EntryLeakReport = {
      entryName: 'config/.env',
      hasFilenameLeak: true,
      filenameLeaks: [{ path: 'config/.env', category: 'credential_file', severity: 'critical', description: 'Credential file' }],
      contentSecrets: [],
      isFlagged: true,
    };

    const mockBomb: ZipBombCheckResult = {
      isBombWarning: true,
      globalRatio: 500,
      maxEntryRatio: 500,
      totalCompressed: 100,
      totalUncompressed: 50000,
      nestedArchivesDetected: false
    };

    const mockSpoofer: EntrySecurityReport = {
      filename: 'invoice.pdf.exe',
      riskLevel: 'danger',
      warnings: ['Disguised executable extension'],
      bidi: { hasBidi: false, charactersFound: [] },
      executable: { isDisguised: true, isRiskyExtension: true, extension: 'exe', doubleExtension: '.pdf.exe' },
      magicByte: { isMismatch: false, claimedExtension: 'exe' }
    };

    const report = generateAuditReport({
      archiveName: 'malicious.zip',
      entries: [{ name: 'config/.env' }, { name: 'invoice.pdf.exe' }],
      securityReports: [mockSpoofer],
      zipBombReport: mockBomb,
      leakReports: [mockLeak],
      mojibakeFindings: [],
    });

    expect(report.summary.riskRating).toBe('CRITICAL');
    expect(report.summary.zipBombDetected).toBe(true);
    expect(report.summary.secretLeaksCount).toBe(1);
    expect(report.summary.flaggedEntries).toBe(2);
  });
});
