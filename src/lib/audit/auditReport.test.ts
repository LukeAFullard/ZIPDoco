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
        { entryName: 'doc.pdf', riskLevel: 'safe', warnings: [], magicMismatch: false, disguisedExtension: false, bidiSpoof: false },
        { entryName: 'photo.jpg', riskLevel: 'safe', warnings: [], magicMismatch: false, disguisedExtension: false, bidiSpoof: false },
      ],
      zipBombReport: { overallRatio: 1.1, exceedsThreshold: false, maxRatioAllowed: 100 },
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
      overallRatio: 500,
      exceedsThreshold: true,
      maxRatioAllowed: 100,
    };

    const mockSpoofer: EntrySecurityReport = {
      entryName: 'invoice.pdf.exe',
      riskLevel: 'high',
      warnings: ['Disguised executable extension'],
      magicMismatch: false,
      disguisedExtension: true,
      bidiSpoof: false,
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
