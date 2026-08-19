import { describe, it, expect } from 'vitest';
import {
  detectEncodingAndRepair,
  scanArchiveMojibake,
  stringToBytesLatin1,
  safeDecodeBytes,
} from './mojibake';

describe('Mojibake Repair Security Module', () => {
  it('should pass through clean UTF-8 strings unmodified', () => {
    const cleanNames = [
      'document.pdf',
      'financial_report.xlsx',
      '日本語_ファイル.txt',
      '中文_文档.docx',
      'résumé_2025.pdf',
    ];

    for (const name of cleanNames) {
      const result = detectEncodingAndRepair(name);
      expect(result.isMangled).toBe(false);
      expect(result.repaired).toBe(name);
    }
  });

  it('should detect double-encoded UTF-8 characters like "Ã©" and repair to "é"', () => {
    // "résumé.txt" double-encoded into UTF-8 interpreted as Latin-1
    const doubleEncoded = 'rÃ©sumÃ©.txt';
    const result = detectEncodingAndRepair(doubleEncoded);

    expect(result.isMangled).toBe(true);
    expect(result.repaired).toBe('résumé.txt');
    expect(result.detectedEncoding).toContain('UTF-8');
  });

  it('should detect and repair Shift-JIS encoded Japanese filenames', () => {
    // Japanese "テスト.txt" in Shift-JIS bytes
    const sjisBytes = new Uint8Array([0x83, 0x65, 0x83, 0x58, 0x83, 0x67, 0x2e, 0x74, 0x78, 0x74]);
    // Interpreted as Latin-1 string:
    const sjisMangled = Array.from(sjisBytes)
      .map(b => String.fromCharCode(b))
      .join('');

    const result = detectEncodingAndRepair(sjisMangled, sjisBytes);

    expect(result.isMangled).toBe(true);
    expect(result.repaired).toBe('テスト.txt');
    expect(result.detectedEncoding).toContain('Shift-JIS');
  });

  it('should detect and repair GBK encoded Chinese filenames', () => {
    // "中文" in GBK: [0xd6, 0xd0, 0xce, 0xc4]
    const gbkBytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4, 0x2e, 0x74, 0x78, 0x74]);
    const gbkMangled = Array.from(gbkBytes)
      .map(b => String.fromCharCode(b))
      .join('');

    const result = detectEncodingAndRepair(gbkMangled, gbkBytes);

    expect(result.isMangled).toBe(true);
    expect(result.repaired).toBe('中文.txt');
    expect(result.detectedEncoding).toContain('GBK');
  });

  it('should helper stringToBytesLatin1 and safeDecodeBytes correctly', () => {
    const bytes = stringToBytesLatin1('abc');
    expect(bytes).toEqual(new Uint8Array([97, 98, 99]));

    const decoded = safeDecodeBytes(bytes, 'utf-8');
    expect(decoded).toBe('abc');

    const invalidDecoder = safeDecodeBytes(new Uint8Array([0xff, 0xff]), 'utf-8');
    expect(invalidDecoder).toBeNull();
  });

  it('should scan archive entries and return only mangled entries', () => {
    const sjisBytes = new Uint8Array([0x83, 0x65, 0x83, 0x58, 0x83, 0x67, 0x2e, 0x74, 0x78, 0x74]); // テスト.txt
    const sjisMangled = Array.from(sjisBytes)
      .map(b => String.fromCharCode(b))
      .join('');

    const entries = [
      { name: 'clean_file.txt' },
      { name: 'rÃ©sumÃ©.pdf' },
      { name: sjisMangled, rawBytes: sjisBytes },
    ];

    const findings = scanArchiveMojibake(entries);

    expect(findings.length).toBe(2);
    expect(findings[0].mojibake.repaired).toBe('résumé.pdf');
    expect(findings[1].mojibake.repaired).toBe('テスト.txt');
  });
});
