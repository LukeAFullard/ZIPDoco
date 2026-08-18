import { describe, it, expect } from 'vitest';
import { scanEntrySecurity } from '../lib/security/spooferShield';

describe('SafetySummaryPanel Logic Integration', () => {
  it('generates correct security reports for panel consumption', () => {
    const normal = scanEntrySecurity({ name: 'document.pdf' });
    const doubleExt = scanEntrySecurity({ name: 'invoice.pdf.exe' });
    const bidi = scanEntrySecurity({ name: 'photo_\u202Egpj.exe' });

    expect(normal.riskLevel).toBe('safe');
    expect(doubleExt.riskLevel).toBe('danger');
    expect(doubleExt.warnings[0]).toContain('Disguised executable detected');
    expect(bidi.riskLevel).toBe('danger');
    expect(bidi.warnings.length).toBeGreaterThan(0);
  });
});
