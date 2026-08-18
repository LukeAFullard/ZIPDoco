import { describe, it, expect } from 'vitest';
import {
  detectBidiControlChars,
  detectDisguisedExecutable,
  checkMagicByteExtensionMatch,
  scanEntrySecurity,
  detectFormatFromMagicBytes,
} from './spooferShield';

describe('Spoofer Shield', () => {
  describe('detectBidiControlChars', () => {
    it('returns hasBidi=false for standard filenames', () => {
      const res = detectBidiControlChars('normal_document.pdf');
      expect(res.hasBidi).toBe(false);
      expect(res.charactersFound).toHaveLength(0);
    });

    it('detects RLO (\\u202E) character in RTLO spoofing attacks', () => {
      // "invoice_pdf\u202Eexe.doc" -> displayed as "invoice_doc.exe" on Windows
      const spoofedName = 'invoice_pdf\u202Eexe.doc';
      const res = detectBidiControlChars(spoofedName);
      expect(res.hasBidi).toBe(true);
      expect(res.charactersFound).toContain('\u202E');
      expect(res.description).toContain('RLO (Right-to-Left Override)');
    });

    it('detects multiple bidi control characters', () => {
      const spoofedName = '\u202Atest_\u202Efdp.exe';
      const res = detectBidiControlChars(spoofedName);
      expect(res.hasBidi).toBe(true);
      expect(res.charactersFound).toContain('\u202A');
      expect(res.charactersFound).toContain('\u202E');
    });
  });

  describe('detectDisguisedExecutable', () => {
    it('identifies standard non-executable files', () => {
      const res = detectDisguisedExecutable('photo.jpg');
      expect(res.isDisguised).toBe(false);
      expect(res.isRiskyExtension).toBe(false);
    });

    it('identifies high-risk extension (.exe, .scr, .bat, .vbs)', () => {
      const res = detectDisguisedExecutable('setup.exe');
      expect(res.isRiskyExtension).toBe(true);
      expect(res.isDisguised).toBe(false);
      expect(res.reason).toContain("High-risk file extension '.exe'");
    });

    it('detects double extension disguised executables (e.g. invoice.pdf.exe)', () => {
      const res = detectDisguisedExecutable('invoice.pdf.exe');
      expect(res.isDisguised).toBe(true);
      expect(res.isRiskyExtension).toBe(true);
      expect(res.doubleExtension).toBe('.pdf.exe');
      expect(res.reason).toContain('Disguised executable detected');
    });

    it('handles nested paths', () => {
      const res = detectDisguisedExecutable('folder/sub/important.doc.scr');
      expect(res.isDisguised).toBe(true);
      expect(res.doubleExtension).toBe('.doc.scr');
    });
  });

  describe('detectFormatFromMagicBytes and checkMagicByteExtensionMatch', () => {
    it('detects PE Windows Executable header (MZ)', () => {
      const header = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
      expect(detectFormatFromMagicBytes(header)).toBe('PE Windows Executable');
    });

    it('detects PDF Document header (%PDF)', () => {
      const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      expect(detectFormatFromMagicBytes(header)).toBe('PDF Document');
    });

    it('detects PNG Image header', () => {
      const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectFormatFromMagicBytes(header)).toBe('PNG Image');
    });

    it('flags PE Windows Executable disguised with .pdf extension', () => {
      const peHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);
      const res = checkMagicByteExtensionMatch('document.pdf', peHeader);
      expect(res.isMismatch).toBe(true);
      expect(res.detectedFormat).toBe('PE Windows Executable');
      expect(res.reason).toContain("File header indicates 'PE Windows Executable', but file extension claims '.pdf'");
    });

    it('does not flag matching format and extension', () => {
      const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const res = checkMagicByteExtensionMatch('manual.pdf', pdfHeader);
      expect(res.isMismatch).toBe(false);
    });
  });

  describe('scanEntrySecurity', () => {
    it('reports safe for normal files', () => {
      const res = scanEntrySecurity({
        name: 'readme.txt',
      });
      expect(res.riskLevel).toBe('safe');
      expect(res.warnings).toHaveLength(0);
    });

    it('reports danger for PE executable disguised as PDF', () => {
      const peHeader = new Uint8Array([0x4d, 0x5a, 0x00, 0x00]);
      const res = scanEntrySecurity({
        name: 'financial_report.pdf',
        magicBytes: peHeader,
      });
      expect(res.riskLevel).toBe('danger');
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(res.warnings[0]).toContain('Critical format mismatch');
    });

    it('reports warning for RTLO filename in text file', () => {
      const res = scanEntrySecurity({
        name: 'notes_\u202Etxt.doc',
      });
      expect(res.riskLevel).toBe('warning');
      expect(res.bidi.hasBidi).toBe(true);
    });
  });
});
