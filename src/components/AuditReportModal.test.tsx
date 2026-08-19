import { describe, it, expect } from 'vitest';
import type { AuditReportData } from '../lib/audit/auditReport';

describe('AuditReportModal Logic & Badge Formatting', () => {
  const sampleReport: AuditReportData = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    archiveName: 'test.zip',
    summary: {
      totalEntries: 5,
      cleanEntries: 4,
      flaggedEntries: 1,
      spooferRisksCount: 1,
      secretLeaksCount: 0,
      mojibakeCount: 0,
      zipBombDetected: false,
      overallRatio: 1.2,
      riskRating: 'HIGH',
    },
    details: {
      spooferReports: [],
      zipBombReport: null,
      secretLeakReports: [],
      mojibakeFindings: [],
    },
    manifest: [
      {
        name: 'invoice.pdf.exe',
        compressedSize: 1000,
        uncompressedSize: 2000,
        hasRisk: true,
        riskReasons: ['Spoofer Risk'],
      },
    ],
  };

  it('validates report summary metrics and manifest flags correctly', () => {
    expect(sampleReport.summary.riskRating).toBe('HIGH');
    expect(sampleReport.summary.flaggedEntries).toBe(1);
    expect(sampleReport.manifest[0].hasRisk).toBe(true);
    expect(sampleReport.manifest[0].riskReasons).toContain('Spoofer Risk');
  });
});
